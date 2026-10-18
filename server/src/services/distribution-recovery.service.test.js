import test from "node:test";
import assert from "node:assert/strict";
import { recoverExpiredDeliveries } from "./distribution-recovery.service.js";

function createMockTransaction({
  candidatePlans = [],
  candidates = [],
  updateCount = 1,
} = {}) {
  const calls = {
    queryRaw: [],
    updateMany: [],
  };

  const tx = {
    $queryRaw: async (strings, ...values) => {
      calls.queryRaw.push({ strings: [...strings], values });

      if (calls.queryRaw.length === 1) {
        return candidatePlans;
      }

      const planCount = new Set(candidatePlans.map((row) => row.planId)).size;

      if (calls.queryRaw.length <= planCount + 1) {
        return [{ locked: true }];
      }

      return candidates;
    },
    distributionDelivery: {
      updateMany: async (args) => {
        calls.updateMany.push(args);
        return { count: updateCount };
      },
    },
  };

  return { tx, calls };
}

test("no expired leases returns an empty list without updating", async () => {
  const { tx, calls } = createMockTransaction();

  const result = await recoverExpiredDeliveries(tx, {
    now: new Date("2026-10-18T08:00:00.000Z"),
  });

  assert.deepEqual(result, []);
  assert.equal(calls.queryRaw.length, 1);
  assert.equal(calls.updateMany.length, 0);
});

test("expired lease moves to reconciliation and clears claim fields", async () => {
  const now = new Date("2026-10-18T08:00:00.000Z");
  const candidate = {
    id: "delivery-1",
    planId: "plan-1",
    claimToken: "claim-1",
    processingLeaseExpiresAt: new Date("2026-10-18T07:55:00.000Z"),
    attemptCount: 2,
  };

  const { tx, calls } = createMockTransaction({
    candidatePlans: [{ planId: "plan-1" }],
    candidates: [candidate],
    updateCount: 1,
  });

  const result = await recoverExpiredDeliveries(tx, { now });

  assert.deepEqual(result, [{
    id: "delivery-1",
    status: "RECONCILIATION_REQUIRED",
    nextAttemptAt: null,
  }]);

  assert.equal(calls.updateMany.length, 1);
  assert.deepEqual(calls.updateMany[0].where, {
    id: "delivery-1",
    status: "PROCESSING",
    claimToken: "claim-1",
    processingLeaseExpiresAt: { lte: now },
    attemptCount: 2,
  });

  assert.deepEqual(calls.updateMany[0].data, {
    status: "RECONCILIATION_REQUIRED",
    processingStartedAt: null,
    processingLeaseExpiresAt: null,
    claimToken: null,
    nextAttemptAt: null,
    lastError:
      "Processing lease expired; external publishing outcome is unknown. " +
      "Reconcile with the platform before retrying.",
  });
});

test("a delivery not updated by the guarded write is not reported as recovered", async () => {
  const { tx, calls } = createMockTransaction({
    candidatePlans: [{ planId: "plan-1" }],
    candidates: [{
      id: "delivery-1",
      planId: "plan-1",
      claimToken: "claim-1",
      processingLeaseExpiresAt: new Date("2026-10-18T07:55:00.000Z"),
      attemptCount: 1,
    }],
    updateCount: 0,
  });

  const result = await recoverExpiredDeliveries(tx, {
    now: new Date("2026-10-18T08:00:00.000Z"),
  });

  assert.deepEqual(result, []);
  assert.equal(calls.updateMany.length, 1);
});

test("invalid limits are rejected before database queries", async () => {
  const { tx, calls } = createMockTransaction();

  await assert.rejects(
    recoverExpiredDeliveries(tx, { limit: 0 }),
    RangeError
  );

  await assert.rejects(
    recoverExpiredDeliveries(tx, { limit: 51 }),
    RangeError
  );

  assert.equal(calls.queryRaw.length, 0);
});
