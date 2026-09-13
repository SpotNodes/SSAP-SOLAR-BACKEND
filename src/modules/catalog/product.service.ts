import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type { ProductEntity, ProductRepository, ProductSearchParams } from './product.repository.js';

/**
 * Supplies the sales ranking behind `sort: 'bestSelling'`.
 *
 * Declared here as a one-method port rather than importing the orders module,
 * so catalog stays unaware of how an order is shaped. `MongoOrderRepository`
 * satisfies it structurally; the container does the wiring.
 */
export interface SalesRankSource {
  topSellingProductIds(params: { limit: number; sinceDays: number }): Promise<string[]>;
}

/** A "best seller" is what sold recently, not what sold once two years ago. */
const BEST_SELLING_WINDOW_DAYS = 90;
/** Deep enough to rank a full first page; beyond this, order is meaningless anyway. */
const BEST_SELLING_RANK_DEPTH = 50;

export class ProductService {
  constructor(
    private readonly products: ProductRepository,
    private readonly sales?: SalesRankSource,
  ) {}

  async search(params: ProductSearchParams): Promise<{ items: ProductEntity[]; total: number }> {
    if (params.sort === 'bestSelling' && this.sales) {
      const rankedIds = await this.sales.topSellingProductIds({
        limit: BEST_SELLING_RANK_DEPTH,
        sinceDays: BEST_SELLING_WINDOW_DAYS,
      });
      // With no sales yet every id ranks equal, and the repo falls through to
      // newest-first — a defensible order, never an empty rail.
      return this.products.search({ ...params, rankedIds });
    }
    return this.products.search(params);
  }

  async getById(id: string): Promise<ProductEntity> {
    const product = await this.products.findById(id);
    if (!product) throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, 'Product not found.');
    return product;
  }
}
