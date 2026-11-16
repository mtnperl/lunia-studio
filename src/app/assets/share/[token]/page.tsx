import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAssetShareByToken, getAssets } from "@/lib/kv";
import { shelfFor } from "@/lib/asset-shelves";
import SharedShelfClient, { type SharedAsset } from "@/components/SharedShelfClient";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared assets — Lunia Life", robots: { index: false, follow: false } };

/** Public, read-only view of one asset shelf. Anyone with the link can see and
 *  download what is on the shelf right now; revoking the link 404s it. */
export default async function SharedShelfPage({ params }: Props) {
  const { token } = await params;
  const share = await getAssetShareByToken(token);
  if (!share) notFound();

  const shelf = shelfFor(share.assetType);
  // Only what a downloader needs — captions and provenance stay internal.
  const assets: SharedAsset[] = (await getAssets())
    .filter((a) => shelf.match(a.assetType))
    .map((a) => ({ id: a.id, url: a.url, name: a.name, type: a.type }));

  return <SharedShelfClient label={shelf.label} assets={assets} />;
}
