import { z } from "zod";
import { CHAT_ROLES, CHAT_PERMISSION_GROUPS } from "./permission.constants.js";

// Validate role parameter
export const permissionRoleSchema = z.object({
  role: z.enum(CHAT_ROLES),
});

// Validate workspace ID parameter
export const permissionWorkspaceParamsSchema = z.object({
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
});

// Build nested permission validation dynamically
const permissionGroupSchemas = Object.fromEntries(
  Object.entries(CHAT_PERMISSION_GROUPS).map(([group, keys]) => [
    group,
    z
      .object(Object.fromEntries(keys.map((key) => [key, z.boolean()])))
      .partial()
      .strict(),
  ]),
);

// Validate nested permission updates
const permissionsSchema = z
  .object(permissionGroupSchemas)
  .partial()
  .strict()
  .refine((permissions) => Object.keys(permissions).length > 0, {
    message: "At least one permission group is required",
  });

export const updatePermissionSchema = z
  .object({
    permissions: permissionsSchema,
  })
  .strict();
