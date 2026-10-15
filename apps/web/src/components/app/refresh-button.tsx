"use client";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** "Actualiser", like on Android: reloads what the page shows (spins while loading). */
export function RefreshButton() {
  const queryClient = useQueryClient();
  const fetching = useIsFetching() > 0;
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={fetching}
      onClick={() => queryClient.refetchQueries({ type: "active" })}
      title="Actualiser"
    >
      <RefreshCw className={cn(fetching && "animate-spin")} />
      {fetching ? "Mise à jour…" : "Actualiser"}
    </Button>
  );
}
