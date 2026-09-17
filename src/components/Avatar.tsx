export function Avatar({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded photos, not worth remotePatterns config
    return <img src={src} alt={name} className={`rounded-full object-cover ${className}`} />;
  }

  return (
    <span className={`flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary ${className}`}>
      {initial}
    </span>
  );
}
