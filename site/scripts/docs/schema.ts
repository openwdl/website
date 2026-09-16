import { z } from "zod";

/**
 * Strict Zod schema for documentation page frontmatter.
 * All fields must be present and valid; unknown keys are rejected.
 */
export const frontmatterSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    slug: z.string().regex(/^\/docs\/(?:[a-z0-9-]+\/)*$/),
    section: z.enum(["learn", "production", "stdlib", "upgrading"]),
    group: z.string().trim().min(1),
    order: z.number().int().nonnegative(),
    kind: z.enum(["tutorial", "guide", "pattern", "reference"]),
    minutes: z.number().int().positive().optional(),
    legacy: z.array(z.string().startsWith("/")),
    headingAliases: z.record(z.string(), z.string()).optional(),
    hidden: z.boolean().optional(),
  })
  .strict();
