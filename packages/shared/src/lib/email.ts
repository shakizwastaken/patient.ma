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

export interface SendAppointmentConfirmationParams {
  to: string;
  patientName: string;
  appointmentTitle: string;
  appointmentDate: string;
  appointmentTime: string;
  organizationName: string;
  meetingLink?: string;
  notes?: string;
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

  async sendAppointmentConfirmation({
    to,
    patientName,
    appointmentTitle,
    appointmentDate,
    appointmentTime,
    organizationName,
    meetingLink,
    notes,
  }: SendAppointmentConfirmationParams) {
    try {
      const meetingSection = meetingLink
        ? `
          <div style="background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 10px 0; color: #10b981;">🎥 Rendez-vous en ligne</h3>
            <p style="margin: 0 0 15px 0;">Ce rendez-vous aura lieu en visioconférence.</p>
            <a href="${meetingLink}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Rejoindre la réunion Google Meet
            </a>
            <p style="margin: 15px 0 0 0; font-size: 14px; color: #6b7280;">
              Vous pouvez également copier ce lien : <br>
              <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${meetingLink}</code>
            </p>
          </div>
        `
        : "";

      const notesSection = notes
        ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 10px 0;">📝 Notes</h3>
            <p style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 0; white-space: pre-wrap;">${notes}</p>
          </div>
        `
        : "";

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `Confirmation de rendez-vous - ${appointmentTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1f2937; margin: 0 0 20px 0;">Confirmation de rendez-vous</h1>
            
            <p style="font-size: 16px; margin: 0 0 20px 0;">Bonjour ${patientName},</p>
            
            <p style="margin: 0 0 20px 0;">Votre rendez-vous a été confirmé avec <strong>${organizationName}</strong>.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin: 0 0 15px 0; color: #374151;">📅 Détails du rendez-vous</h2>
              <p style="margin: 0 0 8px 0;"><strong>Titre :</strong> ${appointmentTitle}</p>
              <p style="margin: 0 0 8px 0;"><strong>Date :</strong> ${appointmentDate}</p>
              <p style="margin: 0;"><strong>Heure :</strong> ${appointmentTime}</p>
            </div>
            
            ${meetingSection}
            
            ${notesSection}
            
            <div style="margin: 30px 0 20px 0; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e;">
                <strong>Important :</strong> Si vous devez annuler ou reporter votre rendez-vous, 
                veuillez nous contacter au moins 24h à l'avance.
              </p>
            </div>
            
            <p style="margin: 20px 0;">Nous avons hâte de vous voir !</p>
            
            <p style="margin: 20px 0 0 0;">
              Cordialement,<br>
              L'équipe ${organizationName}
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Failed to send appointment confirmation email:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  },
};
