import "dotenv/config";
import { prisma } from "../lib/prisma.js";

const pollIntervalMs = Math.max(
  5000,
  Number.parseInt(process.env.DISTRIBUTION_POLL_INTERVAL_MS || "30000", 10) || 30000
);

// Intentionally empty until real, authenticated publishing integrations exist.
const platformAdapters = new Map();

let stopping = false;
let cycleRunning = false;

function log(event, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    component: "distribution-worker",
    event,
    ...details,
  }));
}

async function runCycle() {
  if (cycleRunning) {
    log("cycle_skipped", { reason: "previous_cycle_still_running" });
    return;
  }

  cycleRunning = true;

  try {
    const now = new Date();

    const dueDeliveries = await prisma.distributionDelivery.findMany({
      where: {
        status: "QUEUED",
        scheduledAt: { lte: now },
        OR: [
          { nextAttemptAt: null },
          { nextAttemptAt: { lte: now } },
        ],
        plan: {
          status: { in: ["QUEUED", "ACTIVE"] },
          content: { status: "APPROVED" },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 50,
      select: {
        id: true,
        platform: true,
        occurrenceNumber: true,
        scheduledAt: true,
        attemptCount: true,
        plan: {
          select: {
            id: true,
            status: true,
            content: {
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
              },
            },
          },
        },
      },
    });

    let adapterReady = 0;
    let adapterMissing = 0;

    for (const delivery of dueDeliveries) {
      const adapter = platformAdapters.get(delivery.platform);

      if (!adapter) {
        adapterMissing += 1;
        log("delivery_deferred_no_adapter", {
          deliveryId: delivery.id,
          planId: delivery.plan.id,
          platform: delivery.platform,
          occurrenceNumber: delivery.occurrenceNumber,
          scheduledAt: delivery.scheduledAt.toISOString(),
          contentId: delivery.plan.content.id,
          contentStatus: delivery.plan.content.status,
          reason: "No publishing adapter is registered; delivery remains queued.",
        });
        continue;
      }

      // No adapter is registered in this initial foundation.
      // Actual claiming and publishing will be implemented separately.
      adapterReady += 1;
    }

    log("cycle_completed", {
      eligibleDueDeliveries: dueDeliveries.length,
      adapterReady,
      adapterMissing,
      stateChangesMade: 0,
    });
  } catch (error) {
    log("cycle_failed", {
      message: error instanceof Error ? error.message : "Unknown worker error",
    });
  } finally {
    cycleRunning = false;
  }
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;

  log("shutdown_started", { signal });

  while (cycleRunning) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  await prisma.$disconnect();
  log("shutdown_completed");
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

const once = process.argv.includes("--once");

log("worker_started", {
  mode: once ? "once" : "polling",
  pollIntervalMs,
  registeredAdapters: [...platformAdapters.keys()],
  safeMode: true,
});

await runCycle();

if (once) {
  await prisma.$disconnect();
} else {
  while (!stopping) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    if (!stopping) await runCycle();
  }
}
