import { z } from "zod";

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(3, "Workspace name must be at least 3 characters")
    .max(50, "Workspace name must be less than 50 characters")
    .trim(),

  logo_url: z
    .string()
    .optional()
    .nullable()
    .refine(
      (url) => !url || isValidUrl(url),
      "Invalid URL format for logo_url",
    ),
});

export const updateWorkspaceSchema = z
  .object({
    name: z
      .string()
      .min(3, "Workspace name must be at least 3 characters")
      .max(50, "Workspace name must be less than 50 characters")
      .trim()
      .optional(),

    logo_url: z
      .string()
      .optional()
      .nullable()
      .refine(
        (url) => !url || isValidUrl(url),
        "Invalid URL format for logo_url",
      ),
  })
  .refine(
    (data) => data.name !== undefined || data.logo_url !== undefined,
    "At least one field must be provided for update",
  );

export const inviteMemberSchema = z.object({
  email: z.email("Invalid email format").toLowerCase().trim(),

  role: z.enum(["MANAGER", "MEMBER"]).default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["MANAGER", "MEMBER"], {
    errorMap: () => ({ message: "Role must be MANAGER or MEMBER" }),
  }),
});

export const transferOwnershipSchema = z.object({
  newOwnerId: z.uuid("Invalid user ID format"),
});
