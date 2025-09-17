import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export interface SendWelcomeEmailParams {
  to: string;
  firstName: string;
}

export interface SendOrganizationInvitationParams {
  to: string;
  invitedByName: string;
  invitedByEmail: string;
  organizationName: string;
  role: string;
  inviteLink: string;
}

export interface SendPasswordResetParams {
  to: string;
  firstName: string;
  resetLink: string;
}

export interface SendEmailVerificationParams {
  to: string;
  firstName: string;
  verificationLink: string;
}

const APP_NAME = "ACME";
const FROM_EMAIL = "no-reply@acme.com";

export const emailService = {
  async sendWelcomeEmail({ to, firstName }: SendWelcomeEmailParams) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `Welcome to ${APP_NAME}!`,
        html: `
          <h1>Welcome to ${APP_NAME}, ${firstName}!</h1>
          <p>Thank you for joining us. We're excited to have you on board.</p>
          <p>Best regards,<br>The ${APP_NAME} Team</p>
        `,
      });

      if (error) {
        console.error("Failed to send welcome email:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  },

  async sendOrganizationInvitation({
    to,
    invitedByName,
    invitedByEmail,
    organizationName,
    role,
    inviteLink,
  }: SendOrganizationInvitationParams) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `You've been invited to join ${organizationName}`,
        html: `
          <h1>You've been invited to join ${organizationName}</h1>
          <p>Hi there!</p>
          <p>${invitedByName} (${invitedByEmail}) has invited you to join <strong>${organizationName}</strong> as a ${role}.</p>
          <p><a href="${inviteLink}" style="background: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Accept Invitation</a></p>
          <p>If you have any questions, please contact ${invitedByEmail}.</p>
          <p>Best regards,<br>The ${APP_NAME} Team</p>
        `,
      });

      if (error) {
        console.error("Failed to send organization invitation:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  },

  async sendPasswordReset({
    to,
    firstName,
    resetLink,
  }: SendPasswordResetParams) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `Reset your ${APP_NAME} password`,
        html: `
          <h1>Reset your ${APP_NAME} password</h1>
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your password. Click the link below to create a new password:</p>
          <p><a href="${resetLink}" style="background: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>The ${APP_NAME} Team</p>
        `,
      });

      if (error) {
        console.error("Failed to send password reset email:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  },

  async sendEmailVerification({
    to,
    firstName,
    verificationLink,
  }: SendEmailVerificationParams) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `Verify your ${APP_NAME} email address`,
        html: `
          <h1>Verify your ${APP_NAME} email address</h1>
          <p>Hi ${firstName},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${verificationLink}" style="background: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
          <p>If you didn't create an account, please ignore this email.</p>
          <p>Best regards,<br>The ${APP_NAME} Team</p>
        `,
      });

      if (error) {
        console.error("Failed to send email verification:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  },
};
