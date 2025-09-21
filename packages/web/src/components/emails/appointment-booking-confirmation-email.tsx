import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { format } from "date-fns";

interface AppointmentBookingConfirmationEmailProps {
  patientName: string;
  organizationName: string;
  organizationLogo?: string;
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  meetingLink?: string;
  notes?: string;
  organizationDescription?: string;
}

export const AppointmentBookingConfirmationEmail = ({
  patientName,
  organizationName,
  organizationLogo,
  appointmentType,
  appointmentDate,
  appointmentTime,
  duration,
  meetingLink,
  notes,
  organizationDescription,
}: AppointmentBookingConfirmationEmailProps) => {
  const previewText = `Votre rendez-vous avec ${organizationName} a été confirmé`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {organizationLogo && (
            <Section style={logoSection}>
              <Img
                src={organizationLogo}
                width="64"
                height="64"
                alt={organizationName}
                style={logo}
              />
            </Section>
          )}

          <Heading style={h1}>Rendez-vous confirmé !</Heading>

          <Text style={text}>Cher/Chère {patientName},</Text>

          <Text style={text}>
            Votre rendez-vous avec <strong>{organizationName}</strong> a été
            réservé et confirmé avec succès.
          </Text>

          {organizationDescription && (
            <Text style={text}>{organizationDescription}</Text>
          )}

          <Section style={appointmentDetails}>
            <Heading style={h2}>Détails du rendez-vous</Heading>

            <div style={detailRow}>
              <Text style={detailLabel}>Type :</Text>
              <Text style={detailValue}>{appointmentType}</Text>
            </div>

            <div style={detailRow}>
              <Text style={detailLabel}>Date :</Text>
              <Text style={detailValue}>{appointmentDate}</Text>
            </div>

            <div style={detailRow}>
              <Text style={detailLabel}>Heure :</Text>
              <Text style={detailValue}>{appointmentTime}</Text>
            </div>

            <div style={detailRow}>
              <Text style={detailLabel}>Durée :</Text>
              <Text style={detailValue}>{duration} minutes</Text>
            </div>

            {meetingLink && (
              <>
                <Hr style={hr} />
                <div style={onlineMeetingSection}>
                  <Heading style={h3}>🎥 Réunion en ligne</Heading>
                  <Text style={text}>
                    Il s'agit d'un rendez-vous en ligne. Veuillez rejoindre la
                    réunion à l'heure prévue en utilisant le lien ci-dessous :
                  </Text>
                  <Button href={meetingLink} style={button}>
                    Rejoindre la réunion en ligne
                  </Button>
                  <Text style={smallText}>
                    Lien de réunion :{" "}
                    <Link href={meetingLink} style={link}>
                      {meetingLink}
                    </Link>
                  </Text>
                </div>
              </>
            )}

            {notes && (
              <>
                <Hr style={hr} />
                <div style={notesSection}>
                  <Heading style={h3}>Notes supplémentaires</Heading>
                  <Text style={text}>{notes}</Text>
                </div>
              </>
            )}
          </Section>

          <Hr style={hr} />

          <Section style={importantInfo}>
            <Heading style={h3}>Informations importantes</Heading>
            <ul style={list}>
              <li style={listItem}>
                Veuillez arriver 5-10 minutes en avance pour votre rendez-vous
              </li>
              <li style={listItem}>
                Si vous devez reporter ou annuler, veuillez nous contacter dès
                que possible
              </li>
              {meetingLink && (
                <li style={listItem}>
                  Pour les rendez-vous en ligne, assurez-vous d'avoir une
                  connexion internet stable et un environnement calme
                </li>
              )}
              <li style={listItem}>
                Apportez tous les documents médicaux ou résultats d'examens
                pertinents
              </li>
            </ul>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Merci d'avoir choisi {organizationName}. Nous avons hâte de vous
            voir !
          </Text>

          <Text style={smallText}>
            Ceci est un e-mail de confirmation automatique. Veuillez ne pas
            répondre à cet e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

AppointmentBookingConfirmationEmail.PreviewProps = {
  patientName: "Jean Dupont",
  organizationName: "Clinique Dr. Smith",
  organizationLogo: "https://example.com/logo.png",
  appointmentType: "Consultation initiale",
  appointmentDate: "Vendredi 15 décembre 2023",
  appointmentTime: "14h00 - 14h45",
  duration: 45,
  meetingLink: "https://meet.google.com/abc-defg-hij",
  notes:
    "Veuillez apporter votre carte d'assurance et tous les dossiers médicaux précédents.",
  organizationDescription:
    "Fournir des soins de santé de qualité avec une attention personnalisée.",
} as AppointmentBookingConfirmationEmailProps;

export default AppointmentBookingConfirmationEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const logoSection = {
  padding: "20px 0",
  textAlign: "center" as const,
};

const logo = {
  borderRadius: "50%",
  objectFit: "cover" as const,
};

const h1 = {
  color: "#1f2937",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
  textAlign: "center" as const,
};

const h2 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "600",
  margin: "30px 0 20px",
  padding: "0",
};

const h3 = {
  color: "#374151",
  fontSize: "18px",
  fontWeight: "600",
  margin: "20px 0 10px",
  padding: "0",
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const appointmentDetails = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "24px",
  margin: "32px 0",
};

const detailRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  margin: "12px 0",
  padding: "8px 0",
  borderBottom: "1px solid #e2e8f0",
};

const detailLabel = {
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: "500",
  margin: "0",
  width: "30%",
};

const detailValue = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0",
  textAlign: "right" as const,
  width: "70%",
};

const onlineMeetingSection = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "20px",
  margin: "20px 0",
  textAlign: "center" as const,
};

const notesSection = {
  backgroundColor: "#fefce8",
  border: "1px solid #fde047",
  borderRadius: "8px",
  padding: "20px",
  margin: "20px 0",
};

const importantInfo = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "20px",
  margin: "20px 0",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  margin: "16px 0",
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const list = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0",
  paddingLeft: "20px",
};

const listItem = {
  margin: "8px 0",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "32px 0",
};

const footer = {
  color: "#6b7280",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "center" as const,
  margin: "32px 0",
};

const smallText = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "16px 0",
};
