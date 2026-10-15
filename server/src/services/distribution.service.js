import { prisma } from "../lib/prisma.js";

const VALID_INTERVALS = new Set(["NONE", "DAY", "WEEK", "MONTH"]);

function getZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function localPartsToInstant(parts, timeZone) {
  const desired = Date.UTC(
    parts.year, parts.month - 1, parts.day,
    parts.hour, parts.minute, parts.second
  );

  let instant = desired;

  // Resolve the intended local wall-clock time to a UTC instant.
  // Iteration accounts for timezone offsets and daylight-saving changes.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getZonedParts(new Date(instant), timeZone);
    const represented = Date.UTC(
      actual.year, actual.month - 1, actual.day,
      actual.hour, actual.minute, actual.second
    );
    const correction = desired - represented;

    if (correction === 0) {
      return new Date(instant);
    }

    instant += correction;
  }

  const result = new Date(instant);
  const resolved = getZonedParts(result, timeZone);

  if (
    resolved.year !== parts.year ||
    resolved.month !== parts.month ||
    resolved.day !== parts.day ||
    resolved.hour !== parts.hour ||
    resolved.minute !== parts.minute
  ) {
    throw new Error(
      "The scheduled local time is ambiguous or does not exist in this timezone. Choose another time."
    );
  }

  return result;
}

function addCalendarInterval(date, interval, timeZone) {
  const local = getZonedParts(date, timeZone);
  const calendar = new Date(Date.UTC(
    local.year, local.month - 1, local.day,
    local.hour, local.minute, local.second
  ));

  if (interval === "DAY") {
    calendar.setUTCDate(calendar.getUTCDate() + 1);
  } else if (interval === "WEEK") {
    calendar.setUTCDate(calendar.getUTCDate() + 7);
  } else if (interval === "MONTH") {
    const originalDay = calendar.getUTCDate();
    calendar.setUTCDate(1);
    calendar.setUTCMonth(calendar.getUTCMonth() + 1);

    const lastDay = new Date(Date.UTC(
      calendar.getUTCFullYear(),
      calendar.getUTCMonth() + 1,
      0
    )).getUTCDate();

    calendar.setUTCDate(Math.min(originalDay, lastDay));
  }

  return localPartsToInstant({
    year: calendar.getUTCFullYear(),
    month: calendar.getUTCMonth() + 1,
    day: calendar.getUTCDate(),
    hour: calendar.getUTCHours(),
    minute: calendar.getUTCMinutes(),
    second: calendar.getUTCSeconds(),
  }, timeZone);
}

export async function listDistributionPlans(context) {
  return prisma.distributionPlan.findMany({
    where: {
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
    },
    orderBy: [
      { scheduledAt: "asc" },
      { createdAt: "desc" },
    ],
    include: {
      content: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
        },
      },
      deliveries: {
        orderBy: [
          { occurrenceNumber: "asc" },
          { platform: "asc" },
        ],
      },
    },
    take: 100,
  });
}

export async function createDistributionPlan({
  context,
  userId,
  contentId,
  platforms,
  scheduledAt,
  timezone = "Africa/Lagos",
  repeatInterval = "NONE",
  repeatCount = 1,
  ipAddress = null,
  userAgent = null,
}) {
  if (!contentId || typeof contentId !== "string") {
    throw new Error("A valid contentId is required.");
  }

  if (
    !Array.isArray(platforms) ||
    platforms.length < 1 ||
    platforms.length > 10
  ) {
    throw new Error("Select between 1 and 10 platforms.");
  }

  const normalizedPlatforms = [
    ...new Set(platforms.map((platform) =>
      typeof platform === "string" ? platform.trim().toLowerCase() : ""
    )),
  ];

  if (
    normalizedPlatforms.some(
      (platform) => !/^[a-z0-9][a-z0-9_-]{0,39}$/.test(platform)
    )
  ) {
    throw new Error(
      "Each platform must be a valid platform identifier."
    );
  }

  if (!VALID_INTERVALS.has(repeatInterval)) {
    throw new Error("Invalid repeatInterval.");
  }

  if (
    !Number.isInteger(repeatCount) ||
    repeatCount < 1 ||
    repeatCount > 30
  ) {
    throw new Error("repeatCount must be an integer between 1 and 30.");
  }

  if (repeatInterval === "NONE" && repeatCount !== 1) {
    throw new Error("repeatCount must be 1 when repeatInterval is NONE.");
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new Error("timezone must be a valid IANA timezone.");
  }

  let firstOccurrence = new Date();

  if (scheduledAt !== undefined && scheduledAt !== null && scheduledAt !== "") {
    if (
      typeof scheduledAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(scheduledAt)
    ) {
      throw new Error(
        "scheduledAt must be an ISO 8601 timestamp with Z or an explicit UTC offset."
      );
    }

    firstOccurrence = new Date(scheduledAt);

    if (Number.isNaN(firstOccurrence.getTime())) {
      throw new Error("scheduledAt is not a valid date.");
    }

    if (firstOccurrence.getTime() < Date.now() - 5000) {
      throw new Error("scheduledAt cannot be in the past.");
    }
  }

  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
      status: "APPROVED",
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  if (!content) {
    throw new Error(
      "Content not found in the active workspace or not approved for publishing."
    );
  }

  const occurrenceDates = [firstOccurrence];

  for (let index = 1; index < repeatCount; index += 1) {
    occurrenceDates.push(
      addCalendarInterval(
        occurrenceDates[index - 1],
        repeatInterval,
        timezone
      )
    );
  }

  const plan = await prisma.$transaction(async (tx) => {
    const createdPlan = await tx.distributionPlan.create({
      data: {
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        contentId: content.id,
        createdById: userId,
        scheduledAt: firstOccurrence,
        timezone,
        repeatInterval,
        repeatCount,
        status: "QUEUED",
        deliveries: {
          create: occurrenceDates.flatMap((date, index) =>
            normalizedPlatforms.map((platform) => ({
              platform,
              occurrenceNumber: index + 1,
              scheduledAt: date,
              status: "QUEUED",
            }))
          ),
        },
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        deliveries: {
          orderBy: [
            { occurrenceNumber: "asc" },
            { platform: "asc" },
          ],
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        userId,
        action: "DISTRIBUTION_PLAN_CREATED",
        resource: "DistributionPlan",
        resourceId: createdPlan.id,
        metadata: {
          contentId: content.id,
          platforms: normalizedPlatforms,
          scheduledAt: firstOccurrence.toISOString(),
          timezone,
          repeatInterval,
          repeatCount,
          deliveryCount: occurrenceDates.length * normalizedPlatforms.length,
        },
        ipAddress,
        userAgent,
      },
    });

    return createdPlan;
  });

  return plan;
}

export async function cancelDistributionPlan({
  context,
  userId,
  planId,
  ipAddress = null,
  userAgent = null,
}) {
  return prisma.$transaction(async (tx) => {
    // Coordinate cancellation with delivery claiming for this plan.
    // This must happen before reading or locking plan/delivery rows.
    await tx.$queryRaw`
      WITH lock_result AS MATERIALIZED (
  SELECT pg_advisory_xact_lock(hashtextextended(${planId}, 0))
)
SELECT TRUE AS "locked"
FROM lock_result
    `;
    const existing = await tx.distributionPlan.findFirst({
      where: {
        id: planId,
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
      },
      include: {
        deliveries: true,
      },
    });

    if (!existing) {
      const error = new Error("Distribution plan not found.");
      error.statusCode = 404;
      throw error;
    }

    if (existing.status !== "QUEUED") {
      const error = new Error(
        "Only queued plans can be cancelled."
      );
      error.statusCode = 409;
      throw error;
    }

    const processingDelivery = existing.deliveries.some(
      (delivery) => delivery.status === "PROCESSING"
    );

    if (processingDelivery) {
      const error = new Error(
        "A delivery is processing. The plan cannot be cancelled safely."
      );
      error.statusCode = 409;
      throw error;
    }

    const updated = await tx.distributionPlan.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        deliveries: {
          updateMany: {
            where: { status: "QUEUED" },
            data: { status: "CANCELLED" },
          },
        },
      },
      include: {
        deliveries: {
          orderBy: [
            { occurrenceNumber: "asc" },
            { platform: "asc" },
          ],
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        userId,
        action: "DISTRIBUTION_PLAN_CANCELLED",
        resource: "DistributionPlan",
        resourceId: existing.id,
        metadata: {
          previousStatus: existing.status,
          cancelledDeliveries: existing.deliveries.filter(
            (delivery) => delivery.status === "QUEUED"
          ).length,
        },
        ipAddress,
        userAgent,
      },
    });

    return updated;
  });
}