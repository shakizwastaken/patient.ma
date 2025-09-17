import * as React from "react";

interface EmailVerificationEmailProps {
  firstName: string;
  verificationLink: string;
  appName: string;
}

export function EmailVerificationEmail({
  firstName,
  verificationLink,
  appName,
}: EmailVerificationEmailProps) {
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
          Verify Your Email
        </h1>
        <p style={{ fontSize: "18px", color: "#666", margin: "0" }}>
          Hi {firstName}, please verify your email address.
        </p>
      </div>

      <div style={{ padding: "40px 20px" }}>
        <p style={{ color: "#666", lineHeight: "1.6", marginBottom: "20px" }}>
          Thanks for signing up for {appName}! To complete your registration,
          please verify your email address by clicking the button below.
        </p>

        <div style={{ textAlign: "center", margin: "40px 0" }}>
          <a
            href={verificationLink}
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              padding: "12px 24px",
              textDecoration: "none",
              borderRadius: "6px",
              display: "inline-block",
            }}
          >
            Verify Email Address
          </a>
        </div>

        <div
          style={{
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            padding: "15px",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          <p style={{ margin: "0", color: "#155724", fontSize: "14px" }}>
            <strong>Why verify?</strong> Email verification helps keep your
            account secure and ensures you receive important notifications.
          </p>
        </div>

        <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
          If the button doesn't work, copy and paste this link into your
          browser:
          <br />
          <a
            href={verificationLink}
            style={{ color: "#007bff", wordBreak: "break-all" }}
          >
            {verificationLink}
          </a>
        </p>

        <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
          This verification link will expire in 24 hours.
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
          If you didn't create an account, you can safely ignore this email.
        </p>
        <p>&copy; 2024 {appName}. All rights reserved.</p>
      </div>
    </div>
  );
}
