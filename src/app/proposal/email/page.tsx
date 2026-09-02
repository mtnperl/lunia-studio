import EmailProposal from "@/components/proposal/EmailProposal";

export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  return <EmailProposal startEmpty={state === "empty"} />;
}
