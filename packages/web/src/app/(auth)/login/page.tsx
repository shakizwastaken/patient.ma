import { LoginForm } from "@/features/auth/login-form";
import { Unauthenticated } from "@/features/auth/unauthenticated";

export default function LoginPage() {
  return (
    <Unauthenticated>
      <LoginForm />
    </Unauthenticated>
  );
}
