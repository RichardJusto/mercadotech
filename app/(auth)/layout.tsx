import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Link href="/" className="text-2xl font-bold text-primary">
        MercadoTech
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
