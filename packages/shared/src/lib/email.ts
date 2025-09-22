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

export interface SendPublicBookingConfirmationParams {
  to: string;
  patientName: string;
  organizationName: string;
  organizationLogo?: string;
  organizationDescription?: string;
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  meetingLink?: string;
  notes?: string;
}

export interface SendPaymentRetryEmailParams {
  to: string;
  patientName: string;
  organizationName: string;
  organizationLogo?: string;
  appointmentTitle: string;
  appointmentDate: string;
  appointmentTime: string;
  retryPaymentUrl: string;
}

export interface SendNewAppointmentNotificationParams {
  to: string;
  ownerName: string;
  organizationName: string;
  organizationLogo?: string;
  patientName: string;
  patientEmail: string;
  patientPhoneNumber?: string;
  appointmentTitle: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  duration: number;
  meetingLink?: string;
  notes?: string;
  isPaidAppointment: boolean;
  paymentStatus?: string;
}

const APP_NAME = "ACME";
const FROM_EMAIL = "updates@email.allignia.io";

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

  async sendPublicBookingConfirmation({
    to,
    patientName,
    organizationName,
    organizationLogo,
    organizationDescription,
    appointmentType,
    appointmentDate,
    appointmentTime,
    duration,
    meetingLink,
    notes,
  }: SendPublicBookingConfirmationParams) {
    try {
      const logoSection = organizationLogo
        ? `
          <div style="text-align: center; margin: 20px 0;">
            <img src="${organizationLogo}" alt="${organizationName}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover;" />
          </div>
        `
        : "";

      const meetingSection = meetingLink
        ? `
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #bfdbfe;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0;">🎥 Réunion en ligne</h3>
            <p style="margin: 0 0 15px 0;">Il s'agit d'un rendez-vous en ligne. Veuillez rejoindre la réunion à l'heure prévue :</p>
            <a href="${meetingLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Rejoindre la réunion en ligne</a>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">Lien de réunion : <a href="${meetingLink}" style="color: #3b82f6;">${meetingLink}</a></p>
          </div>
        `
        : "";

      const notesSection = notes
        ? `
          <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fde047;">
            <h3 style="color: #a16207; margin: 0 0 10px 0;">📝 Notes supplémentaires</h3>
            <p style="margin: 0; white-space: pre-wrap;">${notes}</p>
          </div>
        `
        : "";

      const descriptionSection = organizationDescription
        ? `<p style="margin: 0 0 20px 0; color: #6b7280;">${organizationDescription}</p>`
        : "";

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `Rendez-vous confirmé - ${organizationName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f6f9fc;">
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              ${logoSection}
              
              <h1 style="color: #1f2937; font-size: 32px; font-weight: bold; margin: 0 0 30px 0; text-align: center;">Rendez-vous confirmé !</h1>
              
              <p style="font-size: 16px; margin: 0 0 20px 0; color: #374151;">Cher/Chère ${patientName},</p>
              
              <p style="margin: 0 0 20px 0; color: #374151;">Votre rendez-vous avec <strong>${organizationName}</strong> a été réservé et confirmé avec succès.</p>
              
              ${descriptionSection}
              
              <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 32px 0; border: 1px solid #e2e8f0;">
                <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Détails du rendez-vous</h2>
                
                <div style="margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-weight: 500;">Type :</span>
                  <span style="color: #1f2937; font-weight: 600;">${appointmentType}</span>
                </div>
                
                <div style="margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-weight: 500;">Date :</span>
                  <span style="color: #1f2937; font-weight: 600;">${appointmentDate}</span>
                </div>
                
                <div style="margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-weight: 500;">Heure :</span>
                  <span style="color: #1f2937; font-weight: 600;">${appointmentTime}</span>
                </div>
                
                <div style="margin: 12px 0; padding: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-weight: 500;">Durée :</span>
                  <span style="color: #1f2937; font-weight: 600;">${duration} minutes</span>
                </div>
              </div>
              
              ${meetingSection}
              
              ${notesSection}
              
              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 32px 0; border: 1px solid #fecaca;">
                <h3 style="color: #dc2626; margin: 0 0 15px 0;">Important Information</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                  <li style="margin: 8px 0;">Please arrive 5-10 minutes early for your appointment</li>
                  <li style="margin: 8px 0;">If you need to reschedule or cancel, please contact us as soon as possible</li>
                  ${
                    meetingLink
                      ? '<li style="margin: 8px 0;">For online appointments, ensure you have a stable internet connection and a quiet environment</li>'
                      : ""
                  }
                  <li style="margin: 8px 0;">Bring any relevant medical documents or previous test results</li>
                </ul>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
              
              <p style="margin: 20px 0; text-align: center; color: #6b7280;">Thank you for choosing ${organizationName}. We look forward to seeing you!</p>
              
              <p style="margin: 16px 0 0 0; text-align: center; color: #9ca3af; font-size: 12px;">This is an automated confirmation email. Please do not reply to this email.</p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error(
          "Failed to send public booking confirmation email:",
          error,
        );
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  },

  async sendPaymentRetryEmail({
    to,
    patientName,
    organizationName,
    organizationLogo,
    appointmentTitle,
    appointmentDate,
    appointmentTime,
    retryPaymentUrl,
  }: SendPaymentRetryEmailParams) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `Finaliser votre réservation - ${organizationName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              ${organizationLogo ? `<img src="${organizationLogo}" alt="${organizationName}" style="height: 60px; margin-bottom: 20px;">` : ""}
              <h1 style="color: #f97316; margin: 0; font-size: 28px;">Transaction incomplète</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">Finalisons votre réservation ensemble</p>
            </div>
            
            <div style="background-color: #fff7ed; border: 2px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #ea580c; margin: 0 0 15px 0; font-size: 18px;">Bonjour ${patientName},</h2>
              <p style="color: #9a3412; margin: 0 0 15px 0; line-height: 1.5;">
                Votre paiement pour le rendez-vous suivant n'a pas pu être finalisé :
              </p>
              
              <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin: 15px 0;">
                <p style="margin: 0; color: #374151;"><strong>Rendez-vous :</strong> ${appointmentTitle}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Date :</strong> ${appointmentDate}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Heure :</strong> ${appointmentTime}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Cabinet :</strong> ${organizationName}</p>
              </div>
              
              <p style="color: #9a3412; margin: 15px 0; line-height: 1.5;">
                Aucun montant n'a été débité de votre carte. Vous pouvez finaliser votre réservation en cliquant sur le bouton ci-dessous.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${retryPaymentUrl}" style="background-color: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Finaliser ma réservation
              </a>
            </div>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Que se passe-t-il ensuite ?</h3>
              <ul style="color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Cliquez sur le bouton pour accéder à votre espace de réservation</li>
                <li>Choisissez de modifier vos détails ou de continuer directement au paiement</li>
                <li>Complétez votre paiement de manière sécurisée via Stripe</li>
                <li>Recevez votre confirmation et invitation de calendrier</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                Si vous avez des questions, contactez directement ${organizationName}.
              </p>
              <p style="margin: 16px 0 0 0; text-align: center; color: #9ca3af; font-size: 12px;">
                Ceci est un e-mail automatique. Merci de ne pas y répondre.
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error("Failed to send payment retry email:", error);
        return { error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Email service error:", error);
      return { error: (error as Error).message };
    }
  },

  async sendNewAppointmentNotification({
    to,
    ownerName,
    organizationName,
    organizationLogo,
    patientName,
    patientEmail,
    patientPhoneNumber,
    appointmentTitle,
    appointmentDate,
    appointmentTime,
    appointmentType,
    duration,
    meetingLink,
    notes,
    isPaidAppointment,
    paymentStatus,
  }: SendNewAppointmentNotificationParams) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `Nouveau rendez-vous - ${organizationName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              ${organizationLogo ? `<img src="${organizationLogo}" alt="${organizationName}" style="height: 60px; margin-bottom: 20px;">` : ""}
              <h1 style="color: #059669; margin: 0; font-size: 28px;">Nouveau rendez-vous</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">Un patient a réservé un rendez-vous</p>
            </div>
            
            <div style="background-color: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">Bonjour ${ownerName},</h2>
              <p style="color: #166534; margin: 0 0 15px 0; line-height: 1.5;">
                Un nouveau rendez-vous a été réservé pour votre organisation :
              </p>
              
              <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin: 15px 0;">
                <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px;">Détails du rendez-vous</h3>
                <p style="margin: 5px 0; color: #374151;"><strong>Patient :</strong> ${patientName}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Email :</strong> ${patientEmail}</p>
                ${patientPhoneNumber ? `<p style="margin: 5px 0; color: #374151;"><strong>Téléphone :</strong> ${patientPhoneNumber}</p>` : ""}
                <p style="margin: 5px 0; color: #374151;"><strong>Type :</strong> ${appointmentType}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Date :</strong> ${appointmentDate}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Heure :</strong> ${appointmentTime}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Durée :</strong> ${duration} minutes</p>
                ${isPaidAppointment ? `<p style="margin: 5px 0; color: #374151;"><strong>Paiement :</strong> ${paymentStatus === "pending" ? "En attente de paiement" : paymentStatus === "paid" ? "Payé" : "Non payé"}</p>` : ""}
                ${meetingLink ? `<p style="margin: 5px 0; color: #374151;"><strong>Lien de réunion :</strong> <a href="${meetingLink}" style="color: #059669;">Rejoindre la réunion</a></p>` : ""}
                ${notes ? `<p style="margin: 5px 0; color: #374151;"><strong>Notes :</strong> ${notes}</p>` : ""}
              </div>
              
              <div style="background-color: #fef3c7; border-radius: 6px; padding: 15px; margin: 15px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>💡 Information :</strong> 
                  ${
                    isPaidAppointment && paymentStatus === "pending"
                      ? "Ce rendez-vous nécessite un paiement. Le patient sera redirigé vers Stripe pour finaliser le paiement."
                      : isPaidAppointment && paymentStatus === "paid"
                        ? "Ce rendez-vous payant a été confirmé et payé avec succès."
                        : "Ce rendez-vous gratuit a été confirmé automatiquement."
                  }
                </p>
              </div>
            </div>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Actions recommandées</h3>
              <ul style="color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Vérifiez votre calendrier pour confirmer la disponibilité</li>
                <li>Préparez les documents nécessaires pour le rendez-vous</li>
                ${meetingLink ? "<li>Testez le lien de réunion avant l'heure prévue</li>" : ""}
                <li>Contactez le patient si des informations supplémentaires sont nécessaires</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                Vous recevez cet e-mail car vous êtes administrateur de ${organizationName}.
              </p>
              <p style="margin: 16px 0 0 0; text-align: center; color: #9ca3af; font-size: 12px;">
                Ceci est un e-mail automatique. Merci de ne pas y répondre.
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error("Failed to send new appointment notification:", error);
        return { error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Email service error:", error);
      return { error: (error as Error).message };
    }
  },
};
