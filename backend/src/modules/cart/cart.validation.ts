import { z } from "zod";

const productId = z.coerce.number().int().safe().min(0);
const variantId = z.coerce.number().int().safe().positive();
const quantity = z.coerce.number().int().min(1).max(99);
const cartVersion = z.coerce.number().int().positive();

export const cartItemIdParam = z
  .object({ cartItemId: z.coerce.number().int().safe().positive() })
  .strict();

export const addCartItem = z
  .object({ productId, variantId, quantity, cartVersion })
  .strict();

export const updateCartItem = z.object({ quantity, cartVersion }).strict();
export const cartMutation = z.object({ cartVersion }).strict();
export const mergeGuestCart = z
  .object({
    items: z
      .array(z.object({ productId, variantId, quantity }).strict())
      .max(100),
  })
  .strict()
  .superRefine((value, context) => {
    const identities = value.items.map(
      (item) => `${item.productId}:${item.variantId}`,
    );
    if (new Set(identities).size !== identities.length)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Duplicate Product/Variant is not allowed",
      });
  });
