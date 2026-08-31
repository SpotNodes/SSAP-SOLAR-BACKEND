import { TtlCache } from '../../core/cache/ttl-cache.js';
import type { CategoryEntity, CategoryRepository } from './category.repository.js';

const CACHE_TTL_MS = 60_000;

export class CategoryService {
  private readonly cache = new TtlCache<CategoryEntity[]>(CACHE_TTL_MS);

  constructor(private readonly categories: CategoryRepository) {}

  async listActive(): Promise<CategoryEntity[]> {
    const cached = this.cache.get();
    if (cached) return cached;

    const categories = await this.categories.findAllActive();
    this.cache.set(categories);
    return categories;
  }

  // Admin mutations call this so an edit is visible immediately instead of waiting out the TTL.
  invalidate(): void {
    this.cache.clear();
  }
}
