const { z } = require("zod");

const CategoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  icon: z.string().trim().max(16).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
});

const CategoryPatchSchema = CategoryCreateSchema.partial();

const TransactionCreateSchema = z.object({
  amount: z.number().finite(),
  type: z.enum(["income", "expense"]),
  currency: z.string().trim().min(1).max(8).optional().default("INR"),
  categoryId: z.string().trim().min(1).optional(),
  note: z.string().trim().max(240).optional(),
  occurredAt: z.string().datetime().optional(),
});

const TransactionPatchSchema = TransactionCreateSchema.partial();

function parseQueryInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

module.exports = {
  CategoryCreateSchema,
  CategoryPatchSchema,
  TransactionCreateSchema,
  TransactionPatchSchema,
  parseQueryInt,
};

