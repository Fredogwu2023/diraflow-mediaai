import test from "node:test";
import assert from "node:assert/strict";
import { completeClaimedDelivery } from "./distribution-completion.service.js";

function createMockTransaction({
  delivery = { planId: "plan-1" },
  updateCount = 0,
} = {}) {
  const calls = {
    lock: 0,
    findUnique: [],
    updateMany: [],
  };

  const tx = {
    $queryRaw: async () => {
      calls.lock += 1;
      return [{ locked: true }];
    },
    distributionDelivery: {
      findUnique: async (args) => {
        calls.findUnique.push(args);
        return delivery;
      },
      updateMany: async (args) => {
        calls.updateMany.push(args);
        return { count: updateCount };
      },
    },
  };

  return { tx, calls };
}

test("missing delivery returns false without updating", async () => {
  const { tx, calls } = createMockTransaction({ delivery: null });

  const result = await completeClaimedDelivery(tx, {
    deliveryId: "delivery-1",
    claimToken: "claim-1",
  });

  assert.equal(result, false);
  assert.equal(calls.lock, 0);
  assert.equal(calls.updateMany.length, 0);
});

test("stale claim cannot complete a delivery", async () => {
  const { tx, calls } = createMockTransaction({ updateCount: 0 });

  const result = await completeClaimedDelivery(tx, {
    deliveryId: "delivery-1",
    claimToken: "stale-claim",
  });

  assert.equal(result, false);
  assert.equal(calls.lock, 1);
  assert.equal(calls.updateMany.length, 1);
  assert.deepEqual(calls.updateMany[0].where, {
    id: "delivery-1",
    status: "PROCESSING",
    claimToken: "stale-claim",
  });
  assert.equal(calls.updateMany[0].data.status, "PUBLISHED");
});

test("valid claim completes only the matching delivery claim", async () => {
  const { tx, calls } = createMockTransaction({ updateCount: 1 });
  const publishedAt = new Date("2026-10-18T08:00:00.000Z");

  const result = await completeClaimedDelivery(tx, {
    deliveryId: "delivery-1",
    claimToken: "current-claim",
    externalPostId: "external-post-1",
    publishedAt,
  });

  assert.equal(result, true);
  assert.equal(calls.lock, 1);
  assert.deepEqual(calls.updateMany[0].where, {
    id: "delivery-1",
    status: "PROCESSING",
    claimToken: "current-claim",
  });
  assert.equal(calls.updateMany[0].data.status, "PUBLISHED");
  assert.equal(calls.updateMany[0].data.externalPostId, "external-post-1");
  assert.equal(calls.updateMany[0].data.publishedAt, publishedAt);
});