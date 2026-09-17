import { JAIL_FINE } from "@/game/types";
import { spaceAt } from "@/game/board";
import { currentPlayer } from "@/game/engine";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { DeedCard } from "./DeedCard";

export function ActionPanel() {
  const game = useGameStore((s) => s.game);
  const busy = useGameStore((s) => s.busy);
  const rolling = useGameStore((s) => s.rolling);
  const selected = useGameStore((s) => s.selected);
  const roll = useGameStore((s) => s.roll);
  const buy = useGameStore((s) => s.buy);
  const pass = useGameStore((s) => s.pass);
  const jailPayAct = useGameStore((s) => s.jailPay);
  const jailRollAct = useGameStore((s) => s.jailRoll);
  const jailCard = useGameStore((s) => s.jailCard);
  const ackCard = useGameStore((s) => s.ackCard);
  if (!game || game.phase === "game_over") return null;

  const player = currentPlayer(game);
  const humanTurn = player.isHuman && !busy;
  const space = spaceAt(player.position);

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4">
      <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Action</p>
      <h2 className="mt-1 font-display text-lg font-medium tracking-tight">
        {busy && !player.isHuman ? `${player.name} is thinking` : player.isHuman ? "Your move" : `${player.name}'s turn`}
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        {rolling
          ? "Dice in the air."
          : game.action === "buy"
            ? `${space.name} is on the market for $${space.price}.`
            : game.action === "jail"
              ? player.jailTurns >= 3
                ? "Third try — pay or roll to leave."
                : "Pay the fine, use a card, or roll doubles."
              : game.action === "card"
                ? game.card?.text
                : game.phase === "awaiting_roll"
                  ? "Roll to move around the circuit."
                  : "Resolving the board."}
      </p>

      {game.action === "buy" && <div className="mt-3"><DeedCard game={game} spaceId={space.id} /></div>}
      {game.action === "card" && game.card && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-bg-subtle p-3">
          <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">
            {game.card.deck === "fortune" ? "Fortune" : "Chance"}
          </p>
          <p className="mt-1 font-display text-base">{game.card.text}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {game.phase === "awaiting_roll" && (
          <Button className="min-w-[8.5rem] flex-1" onClick={roll} disabled={!humanTurn || rolling}>
            Roll dice
          </Button>
        )}
        {game.action === "buy" && (
          <>
            <Button className="flex-1" onClick={buy} disabled={!humanTurn || player.money < (space.price ?? 0)}>
              Buy ${space.price}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={pass} disabled={!humanTurn}>
              Pass
            </Button>
          </>
        )}
        {game.action === "jail" && (
          <>
            <Button className="flex-1" onClick={jailPayAct} disabled={!humanTurn || player.money < JAIL_FINE}>
              Pay ${JAIL_FINE}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={jailRollAct} disabled={!humanTurn || rolling}>
              Roll
            </Button>
            {player.jailFree > 0 && (
              <Button variant="ghost" className="flex-1" onClick={jailCard} disabled={!humanTurn}>
                Use card
              </Button>
            )}
          </>
        )}
        {game.action === "card" && (
          <Button className="flex-1" onClick={ackCard} disabled={!humanTurn}>
            Continue
          </Button>
        )}
      </div>

      {selected != null && game.action !== "buy" && (
        <div className="mt-3">
          <DeedCard game={game} spaceId={selected} />
        </div>
      )}

      <ol className="mt-3 space-y-1 lg:hidden">
        {game.log.slice(-3).reverse().map((entry) => (
          <li key={entry.id} className="text-xs text-fg-muted">
            {entry.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
