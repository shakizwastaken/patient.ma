import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { Unauthenticated } from "@/features/auth/unauthenticated";

export default function ResetPasswordPage() {
  return (
    <Unauthenticated>
      <ResetPasswordForm />
    </Unauthenticated>
  );
}
