import { z } from "zod";

import {
  WORKSPACE_ROLES,
  WORKSPACE_PERMISSION_GROUPS,
} from "./permission.constants.js";

// ==========================================
// WORKSPACE ROLE VALIDATION
// ==========================================

export const workspacePermissionRoleSchema = z.enum(WORKSPACE_ROLES);

// ==========================================
// WORKSPACE PARAMS VALIDATION
// ==========================================

export const workspacePermissionParamsSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
});

export const workspacePermissionRoleParamsSchema =
  workspacePermissionParamsSchema.extend({
    role: workspacePermissionRoleSchema,
  });

// ==========================================
// PERMISSION GROUP VALIDATION
// ==========================================

const permissionGroupSchemas = Object.fromEntries(
  Object.entries(WORKSPACE_PERMISSION_GROUPS).map(([group, keys]) => [
    group,
    z
      .object(Object.fromEntries(keys.map((key) => [key, z.boolean()])))
      .partial()
      .strict(),
  ]),
);

// ==========================================
// UPDATE WORKSPACE PERMISSIONS VALIDATION
// ==========================================

export const updateWorkspacePermissionSchema = z
  .object(permissionGroupSchemas)
  .partial()
  .strict()
  .refine((permissions) => Object.keys(permissions).length > 0, {
    message: "At least one permission group must be provided",
  })
  .refine(
    (permissions) =>
      Object.values(permissions).every(
        (group) => group !== undefined && Object.keys(group).length > 0,
      ),
    {
      message: "Permission groups cannot be empty",
    },
  );
