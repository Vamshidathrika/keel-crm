import { z } from "zod";

/**
 * Factory to generate dynamic Zod schemas for custom fields
 */
export function buildDynamicZodSchema(definitions: any[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const def of definitions) {
    let validator: z.ZodTypeAny;

    switch (def.fieldType) {
      case "number":
      case "currency":
        validator = z.coerce.number();
        break;
      case "boolean":
        validator = z.boolean();
        break;
      case "date":
        validator = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");
        break;
      case "select":
      case "dropdown":
        const opts = (def.options as string[]) || [];
        validator = opts.length > 0 ? z.enum(opts as [string, ...string[]]) : z.string();
        break;
      case "url":
        validator = z.string().url().or(z.literal(""));
        break;
      case "text":
      default:
        validator = z.string();
        break;
    }

    if (!def.isRequired) {
      validator = validator.optional().nullable();
    }

    shape[def.key] = validator;
  }

  return z.object(shape);
}
