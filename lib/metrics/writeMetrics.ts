type CounterMap = Record<string, number>;

const counters: CounterMap = {};
const timings: Record<string, number[]> = {};

export function metricInc(name: string, by = 1): void {
  counters[name] = (counters[name] || 0) + by;
}

export function metricTiming(name: string, durationMs: number): void {
  if (!timings[name]) timings[name] = [];
  timings[name].push(durationMs);
  if (timings[name].length > 500) timings[name].shift();
}

export function getWriteMetricsSnapshot(): { counters: CounterMap; timingsP95: Record<string, number> } {
  const timingsP95: Record<string, number> = {};
  for (const [name, values] of Object.entries(timings)) {
    if (values.length === 0) continue;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(0.95 * (sorted.length - 1));
    timingsP95[name] = sorted[index];
  }
  return { counters: { ...counters }, timingsP95 };
}
