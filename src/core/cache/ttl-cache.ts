// In-memory only — fine for a single instance. Swap for Redis if this ever runs multi-instance
// (PRD §2 recommended stack already flags Redis as the future cache/queue option).
export class TtlCache<T> {
  private entry: { data: T; expiresAt: number } | undefined;

  constructor(private readonly ttlMs: number) {}

  get(): T | undefined {
    if (!this.entry || Date.now() > this.entry.expiresAt) return undefined;
    return this.entry.data;
  }

  set(data: T): void {
    this.entry = { data, expiresAt: Date.now() + this.ttlMs };
  }

  clear(): void {
    this.entry = undefined;
  }
}
