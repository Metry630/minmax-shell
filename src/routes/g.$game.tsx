import { Link, createFileRoute } from "@tanstack/react-router";

const games: Record<string, { name: string }> = {
  guard: { name: "Guard to Sub" },
};

export const Route = createFileRoute("/g/$game")({
  head: ({ params }) => {
    const game = games[params.game];
    const title = game ? `${game.name} — minmax` : "Game not found — minmax";
    const description = game
      ? `Play today's ${game.name} optimisation puzzle.`
      : "This minmax game could not be found.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
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
        <Link to="/" className="mt-4 w-fit text-sm font-medium text-primary underline underline-offset-4">
          Back to minmax
        </Link>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 sm:px-8">
      <header className="border-b border-border py-5 sm:py-7">
        <h1 className="truncate text-xl font-semibold tracking-normal">{game.name}</h1>
      </header>
      <main className="flex flex-1 items-start py-10 sm:py-14">
        <p className="text-sm text-muted-foreground">Today's puzzle goes here.</p>
      </main>
      <footer className="border-t border-border py-5 text-xs text-muted-foreground">
        <span>minmax</span>
      </footer>
    </div>
  );
}