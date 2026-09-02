import type { Metadata } from "next";
import { ProposalProviders } from "./providers";

export const metadata: Metadata = { title: "Redesign proposal · Lunia Studio" };

/** Phase 3 prototype area. Mocked data, real primitives, no backend calls. */
export default function ProposalLayout({ children }: { children: React.ReactNode }) {
  return <ProposalProviders>{children}</ProposalProviders>;
}
