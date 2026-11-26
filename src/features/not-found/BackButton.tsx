"use client";

import { useRouter } from "next/navigation";
import { Button, Icon } from "@/components/ui";

// Goes back when there's history to go back to; otherwise home.
export function BackButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="lg"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
    >
      <Icon name="arrowLeft" size={16} />
      Go back
    </Button>
  );
}
