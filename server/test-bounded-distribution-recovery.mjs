import "dotenv/config";
import assert from "node:assert/strict";

const original = process.env.DATABASE_URL;
if (!original) throw new Error("DATABASE_URL is missing.");

const url = new URL(original);
url.pathname = "/diraflow_mediaai_concurrency_test";
process.env.DATABASE_URL = url.toString();

const { prisma } = await import("./src/lib/prisma.js");
const { recoverExpiredDeliveries } = await import(
  "./src/services/distribution-recovery.service.js"
);

let verifiedTestDatabase = false;
const ids = {
  organizationId: null,
  userId: null,
  workspaceId: null,
  contentId: null,
  planId: null,
  deliveryIds: [],
};

try {
  const dbRows = await prisma.$queryRaw`SELECT current_database() AS name`;
  const database = dbRows[0]?.name;

  if (database !== "diraflow_mediaai_concurrency_test") {
    throw new Error(
      `Wrong database: ${database}. Expected diraflow_mediaai_concurrency_test. No test fixtures created.`
    );
  }
  verifiedTestDatabase = true;

  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date();
  const expiredAt = new Date(now.getTime() - 60_000);
  const liveLeaseUntil = new Date(now.getTime() + 5 * 60_000);

  const organization = await prisma.organization.create({
    data: {
      name: `Concurrency Retry Test ${runId}`,
      slug: `retry-test-${runId}`,
    },
  });
  ids.organizationId = organization.id;

  const user = await prisma.user.create({
    data: {
      email: `retry-test-${runId}@example.invalid`,
      passwordHash: "test-only-not-a-real-password-hash",
      firstName: "Retry",
      lastName: "Test",
    },
  });
  ids.userId = user.id;

  const workspace = await prisma.workspace.create({
    data: {
      organizationId: organization.id,
      name: `Retry Test Workspace ${runId}`,
      slug: `retry-test-${runId}`,
    },
  });
  ids.workspaceId = workspace.id;

  const content = await prisma.content.create({
    data: {
      organizationId: organization.id,
      workspaceId: workspace.id,
      createdById: user.id,
      title: `Retry Test Content ${runId}`,
      type: "TEXT",
      body: "Automated recovery test fixture.",
    },
  });
  ids.contentId = content.id;

  const plan = await prisma.distributionPlan.create({
    data: {
      organizationId: organization.id,
      workspaceId: workspace.id,
      contentId: content.id,
      createdById: user.id,
      timezone: "Africa/Lagos",
      status: "ACTIVE",
    },
  });
  ids.planId = plan.id;

  const deliverySpecs = [
    {
      platform: `retry-${runId}`,
      occurrenceNumber: 1,
      attemptCount: 2,
      processingLeaseExpiresAt: expiredAt,
      claimToken: `retry-token-${runId}`,
      processingStartedAt: new Date(expiredAt.getTime() - 30_000),
    },
    {
      platform: `exhausted-${runId}`,
      occurrenceNumber: 2,
      attemptCount: 5,
      processingLeaseExpiresAt: expiredAt,
      claimToken: `exhausted-token-${runId}`,
      processingStartedAt: new Date(expiredAt.getTime() - 30_000),
    },
    {
      platform: `live-${runId}`,
      occurrenceNumber: 3,
      attemptCount: 1,
      processingLeaseExpiresAt: liveLeaseUntil,
      claimToken: `live-token-${runId}`,
      processingStartedAt: now,
    },
  ];

  const created = [];
  for (const spec of deliverySpecs) {
    const delivery = await prisma.distributionDelivery.create({
      data: {
        planId: plan.id,
        platform: spec.platform,
        occurrenceNumber: spec.occurrenceNumber,
        scheduledAt: expiredAt,
        status: "PROCESSING",
        attemptCount: spec.attemptCount,
        processingStartedAt: spec.processingStartedAt,
        processingLeaseExpiresAt: spec.processingLeaseExpiresAt,
        claimToken: spec.claimToken,
      },
    });
    created.push(delivery);
    ids.deliveryIds.push(delivery.id);
  }

  const recovered = await prisma.$transaction(tx =>
    recoverExpiredDeliveries(tx, { now, limit: 10 })
  );

  const finalRows = await prisma.distributionDelivery.findMany({
    where: { id: { in: ids.deliveryIds } },
    orderBy: { occurrenceNumber: "asc" },
    select: {
      id: true,
      status: true,
      attemptCount: true,
      nextAttemptAt: true,
      processingStartedAt: true,
      processingLeaseExpiresAt: true,
      claimToken: true,
      lastError: true,
    },
  });

  const retryRow = finalRows.find(row => row.id === created[0].id);
  const exhaustedRow = finalRows.find(row => row.id === created[1].id);
  const liveRow = finalRows.find(row => row.id === created[2].id);

  assert.equal(retryRow.status, "RECONCILIATION_REQUIRED");
  assert.equal(retryRow.attemptCount, 2);
  assert.equal(retryRow.nextAttemptAt, null);
  assert.ok(
    Math.abs(
      retryRow.nextAttemptAt === null ? 0 : 1
    ) <= 1500,
    "Expired leases must not be automatically retried."
  );
  assert.equal(retryRow.claimToken, null);
  assert.equal(retryRow.processingStartedAt, null);
  assert.equal(retryRow.processingLeaseExpiresAt, null);
  assert.match(retryRow.lastError, /outcome is unknown/i);

  assert.equal(exhaustedRow.status, "RECONCILIATION_REQUIRED");
  assert.equal(exhaustedRow.attemptCount, 5);
  assert.equal(exhaustedRow.nextAttemptAt, null);
  assert.equal(exhaustedRow.claimToken, null);
  assert.equal(exhaustedRow.processingLeaseExpiresAt, null);
  assert.match(exhaustedRow.lastError, /outcome is unknown/i);

  assert.equal(liveRow.status, "PROCESSING");
  assert.equal(liveRow.claimToken, `live-token-${runId}`);
  assert.equal(
    liveRow.processingLeaseExpiresAt.getTime(),
    liveLeaseUntil.getTime()
  );

  console.log(JSON.stringify({
    test: "bounded_expired_lease_recovery",
    database,
    recoveredCount: recovered.length,
    checks: {
      attempt2RequiresReconciliation: true,
      attempt5RequiresReconciliation: true,
      expiredClaimsCleared: true,
      unexpiredClaimPreserved: true,
      retryErrorMessageCorrect: true,
    },
    passed: true,
  }, null, 2));
} finally {
  if (verifiedTestDatabase) {
    // Delete only the unique records created by this test.
    if (ids.deliveryIds.length) {
      await prisma.distributionDelivery.deleteMany({
        where: { id: { in: ids.deliveryIds } },
      });
    }
    if (ids.planId) {
      await prisma.distributionPlan.deleteMany({
        where: { id: ids.planId },
      });
    }
    if (ids.contentId) {
      await prisma.content.deleteMany({ where: { id: ids.contentId } });
    }
    if (ids.workspaceId) {
      await prisma.workspace.deleteMany({ where: { id: ids.workspaceId } });
    }
    if (ids.organizationId) {
      await prisma.organization.deleteMany({
        where: { id: ids.organizationId },
      });
    }
    if (ids.userId) {
      await prisma.user.deleteMany({ where: { id: ids.userId } });
    }
  }
  await prisma.$disconnect();
}
