import CarouselProposal from "@/components/proposal/CarouselProposal";

export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  return <CarouselProposal startEmpty={state === "empty"} />;
}
