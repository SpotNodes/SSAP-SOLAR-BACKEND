import { CategoryModel } from './category.model.js';

export interface CategoryEntity {
  id: string;
  name: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateCategoryData {
  id: string;
  name: string;
  iconKey: string;
  sortOrder: number;
}

export interface UpdateCategoryData {
  name?: string;
  iconKey?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CategoryRepository {
  findAllActive(): Promise<CategoryEntity[]>;

  // Admin operations — unscoped by isActive.
  findAllAdmin(): Promise<CategoryEntity[]>;
  findByIdAdmin(id: string): Promise<CategoryEntity | null>;
  create(data: CreateCategoryData): Promise<CategoryEntity>;
  update(id: string, data: UpdateCategoryData): Promise<CategoryEntity | null>;
  softDelete(id: string): Promise<CategoryEntity | null>;
}

function toEntity(doc: {
  _id: string;
  name: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
}): CategoryEntity {
  return {
    id: doc._id,
    name: doc.name,
    iconKey: doc.iconKey,
    sortOrder: doc.sortOrder,
    isActive: doc.isActive,
  };
}

export class MongoCategoryRepository implements CategoryRepository {
  async findAllActive(): Promise<CategoryEntity[]> {
    const docs = await CategoryModel.find({ isActive: true }).sort({ sortOrder: 1 });
    return docs.map(toEntity);
  }

  async findAllAdmin(): Promise<CategoryEntity[]> {
    const docs = await CategoryModel.find({}).sort({ sortOrder: 1 });
    return docs.map(toEntity);
  }

  async findByIdAdmin(id: string): Promise<CategoryEntity | null> {
    const doc = await CategoryModel.findOne({ _id: id });
    return doc ? toEntity(doc) : null;
  }

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    const { id, ...rest } = data;
    const doc = await CategoryModel.create({ _id: id, ...rest, isActive: true });
    return toEntity(doc);
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity | null> {
    const doc = await CategoryModel.findOneAndUpdate({ _id: id }, data, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async softDelete(id: string): Promise<CategoryEntity | null> {
    const doc = await CategoryModel.findOneAndUpdate({ _id: id }, { isActive: false }, { new: true });
    return doc ? toEntity(doc) : null;
  }
}
