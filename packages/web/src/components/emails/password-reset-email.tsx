import * as React from "react";

interface PasswordResetEmailProps {
  firstName: string;
  resetLink: string;
  appName: string;
}

export function PasswordResetEmail({
  firstName,
  resetLink,
  appName,
}: PasswordResetEmailProps) {
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
        <h1 style={{ color: "#333", margin: "0 0 20px 0" }}>
          Reset Your Password
        </h1>
        <p style={{ fontSize: "18px", color: "#666", margin: "0" }}>
          Hi {firstName}, we received a request to reset your password.
        </p>
      </div>

      <div style={{ padding: "40px 20px" }}>
        <p style={{ color: "#666", lineHeight: "1.6", marginBottom: "20px" }}>
          Someone requested a password reset for your {appName} account. If this
          was you, click the button below to reset your password.
        </p>

        <div style={{ textAlign: "center", margin: "40px 0" }}>
          <a
            href={resetLink}
            style={{
              backgroundColor: "#dc3545",
              color: "#fff",
              padding: "12px 24px",
              textDecoration: "none",
              borderRadius: "6px",
              display: "inline-block",
            }}
          >
            Reset Password
          </a>
        </div>

        <div
          style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeaa7",
            padding: "15px",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          <p style={{ margin: "0", color: "#856404", fontSize: "14px" }}>
            <strong>Security Notice:</strong> This password reset link will
            expire in 1 hour for your security.
          </p>
        </div>

        <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
          If you didn't request this password reset, please ignore this email.
          Your password will remain unchanged.
        </p>

        <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
          If the button doesn't work, copy and paste this link into your
          browser:
          <br />
          <a
            href={resetLink}
            style={{ color: "#007bff", wordBreak: "break-all" }}
          >
            {resetLink}
          </a>
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
        <p>If you need help, contact our support team.</p>
        <p>&copy; 2024 {appName}. All rights reserved.</p>
      </div>
    </div>
  );
}
