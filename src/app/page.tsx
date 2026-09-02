import StudioApp from "@/components/StudioApp";
import { isTab } from "@/components/shell/nav";

/** The studio. Views are addressed by `?v=`; documents by /c/:id and /e/:id. */
export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  return <StudioApp initialTab={isTab(v) ? v : "home"} />;
}
