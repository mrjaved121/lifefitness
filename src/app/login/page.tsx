import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const { registered } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <LoginForm registered={registered === "1"} />
    </div>
  );
}
