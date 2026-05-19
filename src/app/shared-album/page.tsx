import { SharedAlbumPage } from "@/components/shared-album-page";

type SharedAlbumPageProps = {
  searchParams: Promise<{ data?: string }>;
};

export default async function SharedAlbumRoute({
  searchParams,
}: SharedAlbumPageProps) {
  const params = await searchParams;
  return <SharedAlbumPage data={params.data} />;
}

