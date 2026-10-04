import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { DemoHistogram } from "@/components/DemoHistogram";
import { anonId } from "@/kit/anon";
import { track } from "@/kit/analytics";
import { getDemoHistogram, submitDemo } from "@/kit/demo.functions";

type Bucket = { value: number; count: number };

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Histogram demo · minmax" },
      { name: "description", content: "A simple submission histogram demo for minmax." },
      { property: "og:title", content: "Histogram demo · minmax" },
      { property: "og:description", content: "A simple submission histogram demo for minmax." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const [input, setInput] = useState("");
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [mine, setMine] = useState<number>();
  const [note, setNote] = useState<string>();

  // Today's histogram from the server (D1 when deployed, memory in the Lovable preview).
  useEffect(() => {
    getDemoHistogram().then(
      ({ buckets }) => setBuckets(buckets),
      (error: unknown) =>
        setNote(
          `Couldn't load the histogram: ${error instanceof Error ? error.message : String(error)}`,
        ),
    );
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(input);
    if (!Number.isInteger(value) || value < 0 || value > 100) return;

    try {
      const result = await submitDemo({ data: { anonId: anonId(), value } });
      setBuckets(result.buckets);
      setInput("");
      if (result.accepted) {
        setMine(value);
        setNote(undefined);
      } else {
        setNote("You've already submitted today. One a day.");
      }
      track("demo_submitted", { value, accepted: result.accepted, store: result.store });
    } catch (error) {
      // The demo exists to surface integration failures, so show the real cause.
      console.error(error);
      setNote(`That didn't go through: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-12 sm:px-8 sm:py-20">
      <header className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          minmax
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">Histogram demo</h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 py-8"
      >
        <label className="min-w-0 text-sm font-medium" htmlFor="demo-number">
          Number
          <input
            id="demo-number"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            required
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="mt-2 h-11 w-full rounded-sm border border-input bg-background px-3 text-base tabular-nums outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-sm bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Submit
        </button>
      </form>

      {note && <p className="pb-4 text-sm text-muted-foreground">{note}</p>}
      <DemoHistogram buckets={buckets} {...(mine === undefined ? {} : { mine })} />
    </main>
  );
}
