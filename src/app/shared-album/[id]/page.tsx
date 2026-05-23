import { SharedAlbumPage } from "@/components/shared-album-page";

type SharedAlbumDynamicRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function SharedAlbumDynamicRoute({
  params,
}: SharedAlbumDynamicRouteProps) {
  const { id } = await params;
  return <SharedAlbumPage shareId={id} />;
}
