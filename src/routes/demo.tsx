import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { DemoHistogram } from "@/components/DemoHistogram";

type Bucket = { value: number; count: number };

// STUB: replaced by a server function later
function submitDemoValue(submissions: number[], value: number): Bucket[] {
  const counts = new Map<number, number>();
  for (const submission of [...submissions, value]) {
    counts.set(submission, (counts.get(submission) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([bucketValue, count]) => ({ value: bucketValue, count }));
}

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Histogram demo — minmax" },
      { name: "description", content: "A simple submission histogram demo for minmax." },
      { property: "og:title", content: "Histogram demo — minmax" },
      { property: "og:description", content: "A simple submission histogram demo for minmax." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const [input, setInput] = useState("");
  const [submissions, setSubmissions] = useState<number[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [mine, setMine] = useState<number>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(input);
    if (!Number.isInteger(value) || value < 0 || value > 100) return;

    setBuckets(submitDemoValue(submissions, value));
    setSubmissions((current) => [...current, value]);
    setMine(value);
    setInput("");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-12 sm:px-8 sm:py-20">
      <header className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">minmax</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">Histogram demo</h1>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 py-8">
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

      <DemoHistogram buckets={buckets} {...(mine === undefined ? {} : { mine })} />
    </main>
  );
}