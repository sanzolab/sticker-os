"use client";

import AppSkeleton from "@/components/app-skeleton";
import { StickerOSApp } from "@/components/sticker-os-app";
import { useHydrated } from "./hooks/useHydrated";

export default function Home() {
  const hydrated = useHydrated();

  if (!hydrated) return <AppSkeleton />;
  return <StickerOSApp />;
}
