type DemoHistogramProps = {
  buckets: { value: number; count: number }[];
  mine?: number;
};

export function DemoHistogram({ buckets, mine }: DemoHistogramProps) {
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));

  if (buckets.length === 0) {
    return (
      <div className="grid min-h-48 place-items-center border-y border-border text-sm text-muted-foreground">
        Submit a number to see the histogram.
      </div>
    );
  }

  return (
    <figure aria-label="Submitted number distribution" className="border-y border-border py-5">
      <div className="flex h-44 items-end gap-2 overflow-x-auto" role="img">
        {buckets.map((bucket) => {
          const isMine = bucket.value === mine;
          const height = Math.max(12, (bucket.count / maxCount) * 100);

          return (
            <div
              className="flex min-w-10 flex-1 flex-col items-center justify-end gap-2"
              key={bucket.value}
              title={`${bucket.value}: ${bucket.count}`}
            >
              <span className="text-xs tabular-nums text-muted-foreground">{bucket.count}</span>
              <div
                aria-label={`${bucket.value}: ${bucket.count}${isMine ? ", your value" : ""}`}
                className={`w-full max-w-12 border ${isMine ? "border-chart-highlight bg-chart-highlight" : "border-chart-bar bg-chart-bar"}`}
                style={{ height: `${height}%` }}
              />
              <span className={`text-xs tabular-nums ${isMine ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {bucket.value}
              </span>
            </div>
          );
        })}
      </div>
      {mine !== undefined && (
        <figcaption className="mt-4 text-xs text-muted-foreground">
          Your latest submission is highlighted.
        </figcaption>
      )}
    </figure>
  );
}
