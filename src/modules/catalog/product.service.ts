import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type { ProductEntity, ProductRepository, ProductSearchParams } from './product.repository.js';

export class ProductService {
  constructor(private readonly products: ProductRepository) {}

  async search(params: ProductSearchParams): Promise<{ items: ProductEntity[]; total: number }> {
    return this.products.search(params);
  }

  async getById(id: string): Promise<ProductEntity> {
    const product = await this.products.findById(id);
    if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, 'Product not found.');
    return product;
  }
}
