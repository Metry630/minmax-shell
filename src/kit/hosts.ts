// Which game a hostname serves. Each game lives on its own domain (DECISIONS 2026-10-04), all from
// one Worker. Hosts not listed here (workers.dev, Lovable preview, localhost) serve every game at
// the path /g/<game>.

export type GameId = "guard";

export const GAME_HOSTS: Readonly<Record<string, GameId>> = {
  // Planned, not bought yet (step 0). Harmless until then: no request carries this Host.
  "armbar.day": "guard",
};

export function gameForHost(hostname: string): GameId | undefined {
  return GAME_HOSTS[hostname.toLowerCase().replace(/^www\./, "")];
}

/** A game's own domain, for share text; undefined for games without one (the demo). */
export function hostForGame(game: string): string | undefined {
  return Object.keys(GAME_HOSTS).find((host) => GAME_HOSTS[host] === game);
}

// Router rewrite pair: on a game's own domain, "/" is that game's page. Only the root is mapped,
// so shared paths (/demo, and later /privacy etc.) keep working on every host. `input` runs before
// the router matches a URL, `output` before it writes one to the address bar, so links to
// /g/guard render as "/" on armbar.day and nowhere else.
export const hostRewrite = {
  input: ({ url }: { url: URL }) => {
    const game = gameForHost(url.hostname);
    if (game && url.pathname === "/") {
      url.pathname = `/g/${game}`;
      return url;
    }
    return undefined;
  },
  output: ({ url }: { url: URL }) => {
    const game = gameForHost(url.hostname);
    if (game && url.pathname === `/g/${game}`) {
      url.pathname = "/";
      return url;
    }
    return undefined;
  },
};
