"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SellerSidebar } from "@/components/layout/SellerSidebar";
import { SupportWidget } from "@/components/chat/SupportWidget";
import { useAuth } from "@/hooks/useAuth";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { profile, initializing } = useAuth();
  const router = useRouter();
  const isSeller = profile?.role === "seller" || profile?.role === "admin";

  useEffect(() => {
    if (initializing) return;
    if (!isSeller) {
      toast.error("Necesitas una cuenta de vendedor");
      router.replace("/");
    }
  }, [initializing, isSeller, router]);

  if (initializing || !isSeller) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SellerSidebar />
      <main className="flex-1 p-4 md:p-6">{children}</main>
      <SupportWidget />
    </div>
  );
}
