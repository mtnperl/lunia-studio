import StudioApp from "@/components/StudioApp";

/** A saved email, by URL. Opens the email editor on it. */
export default async function EmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudioApp initialOpen={{ kind: "email", id }} />;
}
