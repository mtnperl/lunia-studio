"use client";
import { useEffect } from "react";
import { ToastProvider, ConfirmProvider } from "@/components/ui";

export function ProposalProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const t = localStorage.getItem("lunia:theme") ?? "light";
    document.documentElement.setAttribute("data-theme", t);
  }, []);
  return <ToastProvider><ConfirmProvider>{children}</ConfirmProvider></ToastProvider>;
}
