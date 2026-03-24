import { z } from "zod";

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(3, "First name must be at least 3 characters long")
    .max(50, "First name must be at most 50 characters long"),

  lastName: z
    .string()
    .min(3, "Last name must be at least 3 characters long")
    .max(50, "Last name must be at most 50 characters long"),

  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username must be at most 30 characters long")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    )
    .trim(),

  email: z
    .string()
    .email("Invalid email address")
    .trim()
    .lowercase()
,
  password: z
    .string()
    .min(6, "Password must be at least 8 characters long")
    .max(100, "Password must be at most 100 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .trim()
    .lowercase(),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  email: z
    .string()
    .email("Invalid email address")
    .trim()
    .lowercase(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .trim()
    .lowercase(),
});
