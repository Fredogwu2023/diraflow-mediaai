import { prisma } from "../lib/prisma.js";

const CREDIT_TYPES = new Set(["ALLOCATION", "TOP_UP", "REFUND"]);

function validateRequest({ organizationId, amount, idempotencyKey }) {
  if (typeof organizationId !== "string" || !organizationId.trim()) {
    throw new Error("organizationId is required.");
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer.");
  }

  if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
    throw new Error("idempotencyKey is required.");
  }

  if (idempotencyKey.length > 255) {
    throw new Error("idempotencyKey must not exceed 255 characters.");
  }
}

function verifyIdempotentReplay(existing, request) {
  if (
    existing.organizationId !== request.organizationId ||
    existing.type !== request.type ||
    existing.amount !== request.amount ||
    existing.referenceType !== (request.referenceType ?? null) ||
    existing.referenceId !== (request.referenceId ?? null)
  ) {
    const error = new Error(
      "This idempotency key has already been used for a different transaction."
    );
    error.code = "IDEMPOTENCY_CONFLICT";
    throw error;
  }

  return {
    transaction: existing,
    balanceAfter: existing.balanceAfter,
    replayed: true
  };
}

async function applyCreditChange(request, direction) {
  validateRequest(request);

  if (direction === "CREDIT" && !CREDIT_TYPES.has(request.type)) {
    throw new Error("Unsupported credit transaction type.");
  }

  if (direction === "DEBIT" && request.type !== "USAGE_DEDUCTION") {
    throw new Error("Unsupported debit transaction type.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const account = await tx.creditAccount.upsert({
        where: { organizationId: request.organizationId },
        create: { organizationId: request.organizationId },
        update: {}
      });

      await tx.$queryRaw`
        SELECT "id"
        FROM "CreditAccount"
        WHERE "id" = ${account.id}
        FOR UPDATE
      `;

      const existing = await tx.creditTransaction.findUnique({
        where: { idempotencyKey: request.idempotencyKey }
      });

      if (existing) {
        return verifyIdempotentReplay(existing, request);
      }

      const lockedAccount = await tx.creditAccount.findUniqueOrThrow({
        where: { id: account.id }
      });

      if (lockedAccount.status !== "ACTIVE") {
        const error = new Error("The organization's credit account is suspended.");
        error.code = "CREDIT_ACCOUNT_SUSPENDED";
        throw error;
      }

      if (direction === "DEBIT" && lockedAccount.balance < request.amount) {
        const error = new Error("Insufficient DiraFlow credits.");
        error.code = "INSUFFICIENT_CREDITS";
        throw error;
      }

      const balanceAfter =
        direction === "CREDIT"
          ? lockedAccount.balance + request.amount
          : lockedAccount.balance - request.amount;

      if (!Number.isSafeInteger(balanceAfter)) {
        throw new Error("The resulting credit balance is outside the safe integer range.");
      }

      const updatedAccount = await tx.creditAccount.update({
        where: { id: account.id },
        data: {
          balance: balanceAfter,
          ...(direction === "CREDIT"
            ? { lifetimeCredited: { increment: request.amount } }
            : { lifetimeDebited: { increment: request.amount } })
        }
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          organizationId: request.organizationId,
          accountId: account.id,
          createdByUserId: request.createdByUserId ?? null,
          type: request.type,
          amount: request.amount,
          balanceAfter: updatedAccount.balance,
          idempotencyKey: request.idempotencyKey,
          referenceType: request.referenceType ?? null,
          referenceId: request.referenceId ?? null,
          description: request.description ?? null
        }
      });

      return {
        transaction,
        balanceAfter: updatedAccount.balance,
        replayed: false
      };
    });
  } catch (error) {
    if (error.code === "P2002") {
      const existing = await prisma.creditTransaction.findUnique({
        where: { idempotencyKey: request.idempotencyKey }
      });

      if (existing) {
        return verifyIdempotentReplay(existing, request);
      }
    }

    throw error;
  }
}

export async function getOrCreateCreditAccount(organizationId) {
  if (typeof organizationId !== "string" || !organizationId.trim()) {
    throw new Error("organizationId is required.");
  }

  return prisma.creditAccount.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {}
  });
}

export async function addCredits(request) {
  return applyCreditChange(request, "CREDIT");
}

export async function deductCredits(request) {
  return applyCreditChange(
    { ...request, type: "USAGE_DEDUCTION" },
    "DEBIT"
  );
}
