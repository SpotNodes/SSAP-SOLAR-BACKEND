import { isDuplicateKeyError } from '../../core/db/mongo-errors.js';
import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type {
  AdminProductSearchParams,
  CreateProductData,
  ProductEntity,
  ProductRepository,
  UpdateProductData,
} from '../catalog/product.repository.js';

export class AdminProductService {
  constructor(private readonly products: ProductRepository) {}

  async search(params: AdminProductSearchParams): Promise<{ items: ProductEntity[]; total: number }> {
    return this.products.searchAdmin(params);
  }

  async getById(id: string): Promise<ProductEntity> {
    const product = await this.products.findByIdAdmin(id);
    if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, 'Product not found.');
    return product;
  }

  async create(data: CreateProductData): Promise<ProductEntity> {
    try {
      return await this.products.create(data);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'A product with this id already exists.',
          [{ field: 'id', message: 'Already in use.' }],
        );
      }
      throw err;
    }
  }

  async update(id: string, data: UpdateProductData): Promise<ProductEntity> {
    const updated = await this.products.update(id, data);
    if (!updated) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, 'Product not found.');
    return updated;
  }

  async softDelete(id: string): Promise<ProductEntity> {
    const updated = await this.products.softDelete(id);
    if (!updated) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, 'Product not found.');
    return updated;
  }

  async setInventory(
    id: string,
    data: { inventoryQuantity?: number; lowStockThreshold?: number },
  ): Promise<ProductEntity> {
    const updated = await this.products.setInventory(id, data);
    if (!updated) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, 'Product not found.');
    return updated;
  }
}
