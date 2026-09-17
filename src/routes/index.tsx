import { createFileRoute } from "@tanstack/react-router";
import { LiveCity } from "@/components/LiveCity";
import { APP_NAME } from "@/lib/sitizen";

export const Route = createFileRoute("/")({
  component: LiveCity,
  head: () => ({
    meta: [
      { title: `${APP_NAME} · Live City` },
      {
        name: "description",
        content: `${APP_NAME} Live City on Stacks testnet. Connect Leather or Xverse. Join is 50 STX. Deeds are SZ-XX. Token is SITZ.`,
      },
    ],
  }),
});
