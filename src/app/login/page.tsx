import { LoginForm } from "./LoginForm";
import { GymHero } from "@/components/GymHero";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const { registered } = await searchParams;

  return (
    <div className="flex flex-1">
      <GymHero />
      <div className="flex flex-1 items-center justify-center p-6">
        <LoginForm registered={registered === "1"} />
      </div>
    </div>
  );
}
