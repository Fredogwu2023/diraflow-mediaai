import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const original = process.env.DATABASE_URL;
if (!original) throw new Error("DATABASE_URL is missing.");

const url = new URL(original);
url.pathname = "/diraflow_mediaai_concurrency_test";
process.env.DATABASE_URL = url.toString();

const { prisma } = await import("./src/lib/prisma.js");
const { recoverExpiredDeliveries } = await import(
  "./src/services/distribution-recovery.service.js"
);
const { completeClaimedDelivery } = await import(
  "./src/services/distribution-completion.service.js"
);

let safeDatabase = false;
let organizationId;
let userId;
let workspaceId;
let contentId;
let planId;
let deliveryId;

try {
  const rows = await prisma.$queryRaw`SELECT current_database() AS name`;
  const database = rows[0]?.name;
  if (database !== "diraflow_mediaai_concurrency_test") {
    throw new Error(`Wrong database: ${database}. No fixtures created.`);
  }
  safeDatabase = true;

  const suffix = randomUUID();
  const now = new Date();
  const expired = new Date(now.getTime() - 60_000);
  const token = randomUUID();

  const organization = await prisma.organization.create({
    data: { name: `Race Test ${suffix}`, slug: `race-${suffix}` },
  });
  organizationId = organization.id;

  const user = await prisma.user.create({
    data: {
      email: `race-${suffix}@example.invalid`,
      passwordHash: "test-only-not-a-real-password-hash",
      firstName: "Race",
      lastName: "Test",
    },
  });
  userId = user.id;

  const workspace = await prisma.workspace.create({
    data: {
      organizationId,
      name: `Race Workspace ${suffix}`,
      slug: `race-${suffix}`,
    },
  });
  workspaceId = workspace.id;

  const content = await prisma.content.create({
    data: {
      organizationId,
      workspaceId,
      createdById: userId,
      title: `Race Content ${suffix}`,
      type: "TEXT",
      body: "Isolated concurrency test.",
    },
  });
  contentId = content.id;

  const plan = await prisma.distributionPlan.create({
    data: {
      organizationId,
      workspaceId,
      contentId,
      createdById: userId,
      status: "ACTIVE",
    },
  });
  planId = plan.id;

  const delivery = await prisma.distributionDelivery.create({
    data: {
      planId,
      platform: `race-${suffix}`,
      occurrenceNumber: 1,
      scheduledAt: expired,
      status: "PROCESSING",
      attemptCount: 2,
      processingStartedAt: expired,
      processingLeaseExpiresAt: expired,
      claimToken: token,
    },
  });
  deliveryId = delivery.id;

  const results = await Promise.allSettled([
    prisma.$transaction(tx =>
      recoverExpiredDeliveries(tx, { now, limit: 10 })
    ),
    prisma.$transaction(tx =>
      completeClaimedDelivery(tx, {
        deliveryId,
        claimToken: token,
        externalPostId: "test-only-race-post",
        publishedAt: now,
      })
    ),
  ]);

  const final = await prisma.distributionDelivery.findUnique({
    where: { id: deliveryId },
    select: {
      status: true,
      externalPostId: true,
      claimToken: true,
      processingLeaseExpiresAt: true,
      nextAttemptAt: true,
    },
  });

  const recoveryWon =
    final.status === "RECONCILIATION_REQUIRED" &&
    final.externalPostId === null &&
    final.claimToken === null &&
    final.processingLeaseExpiresAt === null;

  const completionWon =
    final.status === "PUBLISHED" &&
    final.externalPostId === "test-only-race-post" &&
    final.claimToken === null &&
    final.processingLeaseExpiresAt === null;

  assert.ok(
    recoveryWon || completionWon,
    `Unexpected final state: ${JSON.stringify(final)}`
  );

  console.log(JSON.stringify({
    test: "recovery_vs_completion_race",
    database,
    outcomes: results.map((result, index) => ({
      operation: index === 0 ? "recovery" : "completion",
      result: result.status,
      ...(result.status === "rejected"
        ? { error: String(result.reason?.message ?? result.reason) }
        : {}),
    })),
    finalState: {
      status: final.status,
      externalPostId: final.externalPostId,
      claimCleared: final.claimToken === null,
      leaseCleared: final.processingLeaseExpiresAt === null,
    },
    exactlyOneSafeOutcome: true,
    winner: recoveryWon ? "recovery" : "completion",
    passed: true,
  }, null, 2));
} finally {
  if (safeDatabase) {
    if (deliveryId) {
      await prisma.distributionDelivery.deleteMany({ where: { id: deliveryId } });
    }
    if (planId) {
      await prisma.distributionPlan.deleteMany({ where: { id: planId } });
    }
    if (contentId) {
      await prisma.content.deleteMany({ where: { id: contentId } });
    }
    if (workspaceId) {
      await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    }
    if (organizationId) {
      await prisma.organization.deleteMany({ where: { id: organizationId } });
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  }
  await prisma.$disconnect();
}
