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
  const previewText = `Your appointment with ${organizationName} has been confirmed`;

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

          <Heading style={h1}>Appointment Confirmed!</Heading>

          <Text style={text}>Dear {patientName},</Text>

          <Text style={text}>
            Your appointment with <strong>{organizationName}</strong> has been
            successfully booked and confirmed.
          </Text>

          {organizationDescription && (
            <Text style={text}>{organizationDescription}</Text>
          )}

          <Section style={appointmentDetails}>
            <Heading style={h2}>Appointment Details</Heading>

            <div style={detailRow}>
              <Text style={detailLabel}>Type:</Text>
              <Text style={detailValue}>{appointmentType}</Text>
            </div>

            <div style={detailRow}>
              <Text style={detailLabel}>Date:</Text>
              <Text style={detailValue}>{appointmentDate}</Text>
            </div>

            <div style={detailRow}>
              <Text style={detailLabel}>Time:</Text>
              <Text style={detailValue}>{appointmentTime}</Text>
            </div>

            <div style={detailRow}>
              <Text style={detailLabel}>Duration:</Text>
              <Text style={detailValue}>{duration} minutes</Text>
            </div>

            {meetingLink && (
              <>
                <Hr style={hr} />
                <div style={onlineMeetingSection}>
                  <Heading style={h3}>🎥 Online Meeting</Heading>
                  <Text style={text}>
                    This is an online appointment. Please join the meeting at
                    the scheduled time using the link below:
                  </Text>
                  <Button href={meetingLink} style={button}>
                    Join Online Meeting
                  </Button>
                  <Text style={smallText}>
                    Meeting Link:{" "}
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
                  <Heading style={h3}>Additional Notes</Heading>
                  <Text style={text}>{notes}</Text>
                </div>
              </>
            )}
          </Section>

          <Hr style={hr} />

          <Section style={importantInfo}>
            <Heading style={h3}>Important Information</Heading>
            <ul style={list}>
              <li style={listItem}>
                Please arrive 5-10 minutes early for your appointment
              </li>
              <li style={listItem}>
                If you need to reschedule or cancel, please contact us as soon
                as possible
              </li>
              {meetingLink && (
                <li style={listItem}>
                  For online appointments, ensure you have a stable internet
                  connection and a quiet environment
                </li>
              )}
              <li style={listItem}>
                Bring any relevant medical documents or previous test results
              </li>
            </ul>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Thank you for choosing {organizationName}. We look forward to seeing
            you!
          </Text>

          <Text style={smallText}>
            This is an automated confirmation email. Please do not reply to this
            email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

AppointmentBookingConfirmationEmail.PreviewProps = {
  patientName: "John Doe",
  organizationName: "Dr. Smith's Clinic",
  organizationLogo: "https://example.com/logo.png",
  appointmentType: "Consultation initiale",
  appointmentDate: "Friday, December 15, 2023",
  appointmentTime: "2:00 PM - 2:45 PM",
  duration: 45,
  meetingLink: "https://meet.google.com/abc-defg-hij",
  notes: "Please bring your insurance card and any previous medical records.",
  organizationDescription:
    "Providing quality healthcare with personalized attention.",
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
