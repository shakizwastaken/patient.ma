import * as React from "react";

interface OrganizationInvitationEmailProps {
  invitedByName: string;
  invitedByEmail: string;
  organizationName: string;
  role: string;
  inviteLink: string;
  appName: string;
}

export function OrganizationInvitationEmail({
  invitedByName,
  invitedByEmail,
  organizationName,
  role,
  inviteLink,
  appName,
}: OrganizationInvitationEmailProps) {
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#333", margin: "0 0 20px 0" }}>You're Invited!</h1>
        <p style={{ fontSize: "18px", color: "#666", margin: "0" }}>
          Join {organizationName} on {appName}
        </p>
      </div>

      <div style={{ padding: "40px 20px" }}>
        <p style={{ color: "#666", lineHeight: "1.6", marginBottom: "20px" }}>
          <strong>{invitedByName}</strong> ({invitedByEmail}) has invited you to
          join <strong>{organizationName}</strong> as a <strong>{role}</strong>.
        </p>

        <div
          style={{
            backgroundColor: "#f8f9fa",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "30px",
          }}
        >
          <h3 style={{ color: "#333", margin: "0 0 10px 0" }}>
            Organization Details
          </h3>
          <p style={{ margin: "5px 0", color: "#666" }}>
            <strong>Organization:</strong> {organizationName}
          </p>
          <p style={{ margin: "5px 0", color: "#666" }}>
            <strong>Role:</strong> {role}
          </p>
          <p style={{ margin: "5px 0", color: "#666" }}>
            <strong>Invited by:</strong> {invitedByName}
          </p>
        </div>

        <div style={{ textAlign: "center", margin: "40px 0" }}>
          <a
            href={inviteLink}
            style={{
              backgroundColor: "#28a745",
              color: "#fff",
              padding: "12px 24px",
              textDecoration: "none",
              borderRadius: "6px",
              display: "inline-block",
              marginRight: "10px",
            }}
          >
            Accept Invitation
          </a>
          <a
            href={`${inviteLink}?action=reject`}
            style={{
              backgroundColor: "#6c757d",
              color: "#fff",
              padding: "12px 24px",
              textDecoration: "none",
              borderRadius: "6px",
              display: "inline-block",
            }}
          >
            Decline
          </a>
        </div>

        <p style={{ color: "#666", fontSize: "14px", textAlign: "center" }}>
          This invitation will expire in 7 days.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "20px",
          textAlign: "center",
          fontSize: "14px",
          color: "#666",
        }}
      >
        <p>
          If you didn't expect this invitation, you can safely ignore this
          email.
        </p>
        <p>&copy; 2024 {appName}. All rights reserved.</p>
      </div>
    </div>
  );
}
