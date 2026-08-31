import { isDuplicateKeyError } from '../../core/db/mongo-errors.js';
import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type {
  CategoryEntity,
  CategoryRepository,
  CreateCategoryData,
  UpdateCategoryData,
} from '../catalog/category.repository.js';

export class AdminCategoryService {
  constructor(private readonly categories: CategoryRepository) {}

  async listAll(): Promise<CategoryEntity[]> {
    return this.categories.findAllAdmin();
  }

  async getById(id: string): Promise<CategoryEntity> {
    const category = await this.categories.findByIdAdmin(id);
    if (!category) throw new AppError(ErrorCode.CATEGORY_NOT_FOUND, 'Category not found.');
    return category;
  }

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    try {
      return await this.categories.create(data);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'A category with this id already exists.',
          [{ field: 'id', message: 'Already in use.' }],
        );
      }
      throw err;
    }
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity> {
    const updated = await this.categories.update(id, data);
    if (!updated) throw new AppError(ErrorCode.CATEGORY_NOT_FOUND, 'Category not found.');
    return updated;
  }

  async softDelete(id: string): Promise<CategoryEntity> {
    const updated = await this.categories.softDelete(id);
    if (!updated) throw new AppError(ErrorCode.CATEGORY_NOT_FOUND, 'Category not found.');
    return updated;
  }
}
