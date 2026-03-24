import { Resend } from "resend";
import logger from "./logger.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendForgotPasswordEmail = async (email, resendUrl) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set in environment variables");
    }
    if (!process.env.EMAIL_FROM) {
      throw new Error("EMAIL_FROM is not set in environment variables");
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Reset your password for ChatCollab",
      html: `
                <p>Hi,</p>
                <p>You have requested to reset your password for ChatCollab. Please click the link below to proceed:</p>
                <a href="${resendUrl}">Reset Password</a>
                <p>If you did not request this, please ignore this email.</p>
                <p>Best regards,<br/>The ChatCollab Team</p>
            `,
    });
  } catch (error) {
    logger.error(
      "Error sending forgot password email:",
      error.message || error,
    );
    throw new Error("Failed to send forgot password email");
  }
};

export const sendVerificationEmail = async (email, verificationUrl) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set in environment variables");
    }
    if (!process.env.EMAIL_FROM) {
      throw new Error("EMAIL_FROM is not set in environment variables");
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Verify your email for ChatCollab",
      html: `
                <p>Hi,</p>
                <p>Thank you for registering on ChatCollab! Please click the link below to verify your email address:</p>
                <a href="${verificationUrl}">Verify Email</a>
                <p>If you did not create an account, please ignore this email.</p>
                <p>Best regards,<br/>The ChatCollab Team</p>
            `,
    });
  } catch (error) {
    logger.error("Error sending verification email:", error.message || error);
    throw new Error("Failed to send verification email");
  }
};
