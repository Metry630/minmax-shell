import { Link, createFileRoute } from "@tanstack/react-router";

import { PlanGame } from "@/components/guard/PlanGame";
import { COPY, SITE, TAGLINE, TITLE } from "@/games/guard/copy";

const games: Record<string, { name: string }> = {
  guard: { name: "Guard to Sub" },
};

export const Route = createFileRoute("/g/$game")({
  head: ({ params }) => {
    const game = games[params.game];
    const title =
      params.game === "guard" ? `${TITLE} · a daily jiu-jitsu puzzle` : "Game not found · minmax";
    const description = game
      ? `${TAGLINE} ${COPY.confirmTitle}`
      : "This minmax game could not be found.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        // The card under a shared link (WhatsApp, X, iMessage): absolute URLs, scripts/icons.ts draws it.
        ...(params.game === "guard"
          ? [
              { property: "og:url", content: `${SITE}/` },
              { property: "og:site_name", content: TITLE },
              { property: "og:image", content: `${SITE}/og.png` },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              {
                property: "og:image:alt",
                content: `${TITLE}: your fighter squares up to an opponent`,
              },
              { name: "twitter:card", content: "summary_large_image" },
            ]
          : [{ name: "twitter:card", content: "summary" }]),
      ],
    };
  },
  component: GamePage,
});

function GamePage() {
  const { game: gameId } = Route.useParams();
  const game = games[gameId];

  if (!game) {
    return (
      <main className="mx-auto grid min-h-screen w-full max-w-xl content-center px-5 py-16 sm:px-8">
        <p className="text-sm text-muted-foreground">Game not found.</p>
        <Link
          to="/"
          className="mt-4 w-fit text-sm font-medium text-primary underline underline-offset-4"
        >
          Back to minmax
        </Link>
      </main>
    );
  }

  return <PlanGame />;
}
