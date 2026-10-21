/** Bounded, single-flight cache. Failed loads have a short cooldown, not a retry storm. */
export class Cache<T> {
  private entries = new Map<string, { until: number; value: Promise<T> }>();

  constructor(private ttl: number, private capacity = 32, private now = Date.now) {}

  get(key: string, load: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing && existing.until > this.now()) return existing.value;
    if (existing) this.entries.delete(key);
    if (this.entries.size >= this.capacity) this.entries.delete(this.entries.keys().next().value!);
    const entry = { until: this.now() + this.ttl, value: Promise.resolve().then(load) };
    this.entries.set(key, entry);
    entry.value.catch(() => { entry.until = this.now() + 60_000; });
    return entry.value;
  }
}
