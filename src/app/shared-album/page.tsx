import { SharedAlbumPage } from "@/components/shared-album-page";

type SharedAlbumLegacyRouteProps = {
  searchParams: Promise<{ data?: string }>;
};

export default async function SharedAlbumLegacyRoute({
  searchParams,
}: SharedAlbumLegacyRouteProps) {
  const params = await searchParams;
  return <SharedAlbumPage data={params.data} />;
}
