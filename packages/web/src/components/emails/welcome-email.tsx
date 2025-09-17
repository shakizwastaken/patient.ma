import * as React from "react";

interface WelcomeEmailProps {
  firstName: string;
  appName: string;
}

export function WelcomeEmail({ firstName, appName }: WelcomeEmailProps) {
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
          Welcome to {appName}!
        </h1>
        <p style={{ fontSize: "18px", color: "#666", margin: "0" }}>
          Hi {firstName}, we're excited to have you on board.
        </p>
      </div>

      <div style={{ padding: "40px 20px" }}>
        <h2 style={{ color: "#333", marginBottom: "20px" }}>Get Started</h2>
        <p style={{ color: "#666", lineHeight: "1.6", marginBottom: "20px" }}>
          Your account has been successfully created. You can now:
        </p>

        <ul style={{ color: "#666", lineHeight: "1.8" }}>
          <li>Complete your profile setup</li>
          <li>Create or join organizations</li>
          <li>Invite team members</li>
          <li>Start collaborating</li>
        </ul>

        <div style={{ textAlign: "center", margin: "40px 0" }}>
          <a
            href={`${process.env.BETTER_AUTH_URL}/dashboard`}
            style={{
              backgroundColor: "#007bff",
              color: "#fff",
              padding: "12px 24px",
              textDecoration: "none",
              borderRadius: "6px",
              display: "inline-block",
            }}
          >
            Go to Dashboard
          </a>
        </div>
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
          If you have any questions, feel free to reach out to our support team.
        </p>
        <p>&copy; 2024 {appName}. All rights reserved.</p>
      </div>
    </div>
  );
}
