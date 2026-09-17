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
          "Sitizen litepaper: Live City on Stacks testnet. Land is the NFT. Houses ride on the deed. Join is 50 STX.",
      },
    ],
  }),
});
