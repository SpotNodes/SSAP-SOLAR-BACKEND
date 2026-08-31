import { CategoryModel } from './category.model.js';

export interface CategoryEntity {
  id: string;
  name: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CategoryRepository {
  findAllActive(): Promise<CategoryEntity[]>;
}

export class MongoCategoryRepository implements CategoryRepository {
  async findAllActive(): Promise<CategoryEntity[]> {
    const docs = await CategoryModel.find({ isActive: true }).sort({ sortOrder: 1 });
    return docs.map((doc) => ({
      id: doc._id,
      name: doc.name,
      iconKey: doc.iconKey,
      sortOrder: doc.sortOrder,
      isActive: doc.isActive,
    }));
  }
}
