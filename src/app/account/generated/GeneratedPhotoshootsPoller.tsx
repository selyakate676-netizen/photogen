"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 5_000;

export default function GeneratedPhotoshootsPoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [active, router]);

  return null;
}
