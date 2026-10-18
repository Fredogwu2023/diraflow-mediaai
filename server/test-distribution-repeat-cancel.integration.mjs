import "dotenv/config";
import assert from "node:assert/strict";

const url = new URL(process.env.DATABASE_URL);
url.pathname = "/diraflow_mediaai_concurrency_test";
process.env.DATABASE_URL = url.toString();

const { prisma } = await import("./src/lib/prisma.js");
const { createDistributionPlan, cancelDistributionPlan } =
  await import("./src/services/distribution.service.js");

let organizationId;
let workspaceId;
let userId;
let contentId;
let testPlanIds = [];

try {
  const rows = await prisma.$queryRaw`
    SELECT current_database() AS "db_name"
  `;
  const databaseName = rows?.[0]?.db_name;

  console.log("Connected database:", databaseName);
  assert.equal(
    databaseName,
    "diraflow_mediaai_concurrency_test",
    "SAFETY STOP: refusing to run outside the dedicated test database"
  );

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const organization = await prisma.organization.create({
    data: {
      name: `Distribution Integration Test ${suffix}`,
      slug: `distribution-test-${suffix}`
    }
  });
  organizationId = organization.id;

  const user = await prisma.user.create({
    data: {
      email: `distribution-test-${suffix}@example.invalid`,
      passwordHash: "integration-test-only-not-a-real-password",
      firstName: "Distribution",
      lastName: "Test"
    }
  });
  userId = user.id;

  const workspace = await prisma.workspace.create({
    data: {
      organizationId,
      name: `Distribution Workspace ${suffix}`,
      slug: `distribution-workspace-${suffix}`
    }
  });
  workspaceId = workspace.id;

  await prisma.organizationMember.create({
    data: { organizationId, userId }
  });

  await prisma.workspaceMember.create({
    data: { workspaceId, userId }
  });

  const content = await prisma.content.create({
    data: {
      organizationId,
      workspaceId,
      createdById: userId,
      approvedById: userId,
      approvedAt: new Date(),
      title: `Approved integration-test content ${suffix}`,
      type: "SOCIAL_POST",
      status: "APPROVED",
      body: "Isolated distribution scheduling integration test."
    }
  });
  contentId = content.id;

  const firstDate = new Date(Date.now() + 10 * 60 * 1000);
  firstDate.setSeconds(0, 0);
  const scheduledAt = firstDate.toISOString();

  console.log("\n=== CREATE REPEATING PLAN ===");

  const plan = await createDistributionPlan({
    context: { organizationId, workspaceId },
    userId,
    contentId,
    platforms: ["test-platform-a", "test-platform-b"],
    scheduledAt,
    timezone: "Africa/Lagos",
    repeatInterval: "WEEK",
    repeatCount: 3
  });

  testPlanIds.push(plan.id);

  const created = await prisma.distributionPlan.findUniqueOrThrow({
    where: { id: plan.id },
    include: {
      deliveries: {
        orderBy: [
          { occurrenceNumber: "asc" },
          { platform: "asc" }
        ]
      }
    }
  });

  assert.equal(created.status, "QUEUED");
  assert.equal(created.repeatInterval, "WEEK");
  assert.equal(created.repeatCount, 3);
  assert.equal(created.deliveries.length, 6, "3 occurrences x 2 platforms");

  for (let occurrence = 1; occurrence <= 3; occurrence++) {
    const deliveries = created.deliveries.filter(
      item => item.occurrenceNumber === occurrence
    );

    assert.equal(deliveries.length, 2);
    assert.deepEqual(
      deliveries.map(item => item.platform).sort(),
      ["test-platform-a", "test-platform-b"]
    );

    const expectedDate = new Date(firstDate);
    expectedDate.setDate(expectedDate.getDate() + (occurrence - 1) * 7);

    for (const delivery of deliveries) {
      assert.equal(delivery.status, "QUEUED");
      assert.equal(
        delivery.scheduledAt.getTime(),
        expectedDate.getTime(),
        `Incorrect scheduled date for occurrence ${occurrence}`
      );
    }
  }

  console.log(JSON.stringify({
    result: "PASS",
    planId: plan.id,
    repeatInterval: created.repeatInterval,
    repeatCount: created.repeatCount,
    deliveryCount: created.deliveries.length,
    occurrenceNumbers: [...new Set(
      created.deliveries.map(item => item.occurrenceNumber)
    )],
    platforms: [...new Set(created.deliveries.map(item => item.platform))],
    dates: [...new Set(
      created.deliveries.map(item => item.scheduledAt.toISOString())
    )]
  }, null, 2));

  console.log("\n=== CANCEL QUEUED PLAN ===");

  const cancelled = await cancelDistributionPlan({
    context: { organizationId, workspaceId },
    userId,
    planId: plan.id
  });

  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.deliveries.length, 6);
  assert.ok(cancelled.deliveries.every(
    item => item.status === "CANCELLED"
  ));

  const persisted = await prisma.distributionPlan.findUniqueOrThrow({
    where: { id: plan.id },
    include: { deliveries: true }
  });

  assert.equal(persisted.status, "CANCELLED");
  assert.equal(persisted.deliveries.length, 6);
  assert.ok(persisted.deliveries.every(
    item => item.status === "CANCELLED"
  ));

  console.log(JSON.stringify({
    result: "PASS",
    planStatus: persisted.status,
    deliveryCount: persisted.deliveries.length,
    cancelledDeliveryCount: persisted.deliveries.filter(
      item => item.status === "CANCELLED"
    ).length,
    persistedStateVerified: true
  }, null, 2));

  console.log("\nPASS: repeating schedule and cancellation integration tests.");
} catch (error) {
  console.error("\nFAIL:", error?.stack ?? error);
  process.exitCode = 1;
} finally {
  if (organizationId) {
    try {
      await prisma.distributionPlan.deleteMany({
        where: { organizationId }
      });
      await prisma.content.deleteMany({
        where: { organizationId }
      });
      await prisma.auditLog.deleteMany({
        where: { organizationId }
      });
      await prisma.workspaceMember.deleteMany({ where: { userId } });
      await prisma.organizationMember.deleteMany({ where: { userId } });
      await prisma.workspace.deleteMany({ where: { organizationId } });
      await prisma.organization.delete({ where: { id: organizationId } });
      if (userId) {
        await prisma.user.delete({ where: { id: userId } });
      }
      console.log("\nCleanup: test fixtures removed.");
    } catch (cleanupError) {
      console.error(
        "\nCLEANUP ERROR — inspect the dedicated test database:",
        cleanupError?.stack ?? cleanupError
      );
      process.exitCode = 1;
    }
  }

  await prisma.$disconnect();
}
