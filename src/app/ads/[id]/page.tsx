import { getAdById } from "@/lib/kv";
import { notFound } from "next/navigation";
import AdShareClient from "@/components/AdShareClient";

type Props = { params: Promise<{ id: string }> };

export default async function AdSharePage({ params }: Props) {
  const { id } = await params;
  const ad = await getAdById(id);

  if (!ad) {
    notFound();
  }

  return <AdShareClient ad={ad} />;
}
