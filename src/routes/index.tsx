import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "minmax — Daily optimisation puzzles" },
      { name: "description", content: "A family of daily optimisation puzzle games." },
      { property: "og:title", content: "minmax — Daily optimisation puzzles" },
      { property: "og:description", content: "A family of daily optimisation puzzle games." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-16 sm:px-8 sm:py-24">
      <header className="border-b border-border pb-8">
        <h1 className="text-4xl font-semibold tracking-normal">minmax</h1>
        <p className="mt-3 text-base text-muted-foreground">Daily optimisation puzzles.</p>
      </header>

      <section aria-labelledby="games-heading" className="pt-8">
        <h2 id="games-heading" className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Games
        </h2>
        <ul className="mt-4 border-t border-border">
          <li className="border-b border-border">
            <Link
              to="/g/$game"
              params={{ game: "guard" }}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-5 text-base font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 truncate">Guard to Sub</span>
              <span aria-hidden="true" className="shrink-0 text-muted-foreground">→</span>
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
