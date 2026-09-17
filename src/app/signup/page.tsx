import { SignupForm } from "./SignupForm";
import { GymHero } from "@/components/GymHero";

export default function SignupPage() {
  return (
    <div className="flex flex-1">
      <GymHero />
      <div className="flex flex-1 items-center justify-center p-6">
        <SignupForm />
      </div>
    </div>
  );
}
