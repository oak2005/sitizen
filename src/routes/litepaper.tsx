import { createFileRoute } from "@tanstack/react-router";
import { Litepaper } from "@/components/Litepaper";

export const Route = createFileRoute("/litepaper")({
  component: Litepaper,
  head: () => ({
    meta: [
      { title: "Sitizen · Litepaper" },
      {
        name: "description",
        content:
          "Sitizen litepaper: what the city means, how Computer City plays now, how Live City will run, land NFTs, houses on the deed, and computers that never hold the clock.",
      },
    ],
  }),
});
