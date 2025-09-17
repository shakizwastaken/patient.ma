"use client";

import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { Unauthenticated } from "@/features/auth/unauthenticated";

export default function ForgotPasswordPage() {
  return (
    <Unauthenticated>
      <ForgotPasswordForm />
    </Unauthenticated>
  );
}
