import { SignUpForm } from "@/features/auth/signup-form";
import { Unauthenticated } from "@/features/auth/unauthenticated";

export default function SignUpPage() {
  return (
    <Unauthenticated>
      <SignUpForm />
    </Unauthenticated>
  );
}
