import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const originalDatabaseUrl = process.env.DATABASE_URL;
if (!originalDatabaseUrl) {
  throw new Error("Safety stop: DATABASE_URL is missing.");
}

const testDatabaseUrl = new URL(originalDatabaseUrl);
testDatabaseUrl.pathname = "/diraflow_mediaai_concurrency_test";
process.env.DATABASE_URL = testDatabaseUrl.toString();

const { prisma } = await import("../lib/prisma.js");
const { addCredits, deductCredits } = await import("./credit.service.js");

const databaseRows = await prisma.$queryRaw`
  SELECT current_database() AS database
`;

if (databaseRows[0]?.database !== "diraflow_mediaai_concurrency_test") {
  await prisma.$disconnect();
  throw new Error("Safety stop: credit tests refuse to run against the wrong database.");
}

test("credit service integration safeguards", async (t) => {
  let organization;

  try {
    organization = await prisma.organization.create({
      data: {
        name: "Temporary Credit Service Test",
        slug: `credit-test-${randomUUID()}`
      }
    });

    await t.test("adds credits and records the ledger transaction", async () => {
      const result = await addCredits({
        organizationId: organization.id,
        amount: 10,
        type: "ALLOCATION",
        idempotencyKey: `test-allocation-${randomUUID()}`
      });

      assert.equal(result.balanceAfter, 10);
      assert.equal(result.replayed, false);
      assert.equal(result.transaction.amount, 10);
    });

    let deductionKey;

    await t.test("deducts credits and supports safe retries", async () => {
      deductionKey = `test-deduction-${randomUUID()}`;

      const request = {
        organizationId: organization.id,
        amount: 3,
        idempotencyKey: deductionKey
      };

      const first = await deductCredits(request);
      const retry = await deductCredits(request);

      assert.equal(first.balanceAfter, 7);
      assert.equal(first.replayed, false);
      assert.equal(retry.balanceAfter, 7);
      assert.equal(retry.replayed, true);

      const account = await prisma.creditAccount.findUniqueOrThrow({
        where: { organizationId: organization.id }
      });

      assert.equal(account.balance, 7);

      const ledgerCount = await prisma.creditTransaction.count({
        where: { idempotencyKey: deductionKey }
      });

      assert.equal(ledgerCount, 1);
    });

    await t.test("rejects reuse of a key with a different amount", async () => {
      await assert.rejects(
        deductCredits({
          organizationId: organization.id,
          amount: 4,
          idempotencyKey: deductionKey
        }),
        (error) => error.code === "IDEMPOTENCY_CONFLICT"
      );
    });

    await t.test("rejects reuse of a key with a different reference", async () => {
      let referenceOrganization;

      try {
        referenceOrganization = await prisma.organization.create({
          data: {
            name: "Temporary Reference Test",
            slug: `credit-reference-${randomUUID()}`
          }
        });

        const key = `test-reference-${randomUUID()}`;

        await addCredits({
          organizationId: referenceOrganization.id,
          amount: 2,
          type: "TOP_UP",
          idempotencyKey: key,
          referenceType: "PAYMENT",
          referenceId: "payment-original"
        });

        await assert.rejects(
          addCredits({
            organizationId: referenceOrganization.id,
            amount: 2,
            type: "TOP_UP",
            idempotencyKey: key,
            referenceType: "PAYMENT",
            referenceId: "payment-different"
          }),
          (error) => error.code === "IDEMPOTENCY_CONFLICT"
        );
      } finally {
        if (referenceOrganization) {
          await prisma.organization.delete({
            where: { id: referenceOrganization.id }
          });
        }
      }
    });
await t.test("rejects insufficient credits without changing balance", async () => {
      await assert.rejects(
        deductCredits({
          organizationId: organization.id,
          amount: 100,
          idempotencyKey: `test-insufficient-${randomUUID()}`
        }),
        (error) => error.code === "INSUFFICIENT_CREDITS"
      );

      const account = await prisma.creditAccount.findUniqueOrThrow({
        where: { organizationId: organization.id }
      });

      assert.equal(account.balance, 7);
    });

    await t.test("rejects deductions from a suspended account", async () => {
      await prisma.creditAccount.update({
        where: { organizationId: organization.id },
        data: { status: "SUSPENDED" }
      });

      await assert.rejects(
        deductCredits({
          organizationId: organization.id,
          amount: 1,
          idempotencyKey: `test-suspended-${randomUUID()}`
        }),
        (error) => error.code === "CREDIT_ACCOUNT_SUSPENDED"
      );

      const account = await prisma.creditAccount.findUniqueOrThrow({
        where: { organizationId: organization.id }
      });

      assert.equal(account.balance, 7);

      await prisma.creditAccount.update({
        where: { organizationId: organization.id },
        data: { status: "ACTIVE" }
      });
    });
    await t.test("prevents concurrent deductions from overspending", async () => {
      const results = await Promise.allSettled([
        deductCredits({
          organizationId: organization.id,
          amount: 5,
          idempotencyKey: `test-concurrent-a-${randomUUID()}`
        }),
        deductCredits({
          organizationId: organization.id,
          amount: 5,
          idempotencyKey: `test-concurrent-b-${randomUUID()}`
        })
      ]);

      assert.equal(
        results.filter((result) => result.status === "fulfilled").length,
        1
      );

      const rejected = results.filter(
        (result) => result.status === "rejected"
      );

      assert.equal(rejected.length, 1);
      assert.equal(rejected[0].reason.code, "INSUFFICIENT_CREDITS");

      const account = await prisma.creditAccount.findUniqueOrThrow({
        where: { organizationId: organization.id }
      });

      assert.equal(account.balance, 2);
      assert.ok(account.balance >= 0);
    });
  } finally {
    if (organization) {
      await prisma.organization.delete({
        where: { id: organization.id }
      });
    }

    await prisma.$disconnect();
  }
});
