import type { CategoryEntity, CategoryRepository } from './category.repository.js';

export class CategoryService {
  constructor(private readonly categories: CategoryRepository) {}

  async listActive(): Promise<CategoryEntity[]> {
    return this.categories.findAllActive();
  }
}
