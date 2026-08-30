"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/lib/auth-context";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export default function RegistroPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-7 flex flex-col items-center gap-3">
        <Image src="/icons/icon-192.png" alt="" width={56} height={56} className="rounded-2xl" />
        <div className="text-center">
          <p className="text-lg font-bold tracking-tight text-[var(--foreground)]">{APP_NAME}</p>
          <p className="text-[13px] text-[var(--foreground-faint)]">{APP_TAGLINE}</p>
        </div>
      </Link>

      <div className="surface-card w-full max-w-sm p-6 sm:p-7">
        <h1 className="mb-5 text-center text-lg font-semibold text-[var(--foreground)]">
          Crea tu cuenta de vendedor
        </h1>
        <AuthForm mode="registro" onSuccess={() => router.push("/dashboard")} />
      </div>

      <p className="mt-6 max-w-sm text-center text-[11.5px] leading-relaxed text-[var(--foreground-faint)]">
        Al registrarte, tu cuenta empieza en estado activo con el rol de vendedor. Podrás
        seleccionar productos y empezar a trabajar leads de inmediato.
      </p>
    </main>
  );
}
