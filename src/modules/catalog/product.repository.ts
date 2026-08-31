import type { ClientSession, FilterQuery, HydratedDocument } from 'mongoose';
import { ProductModel, type ProductSchemaType, type ProductSpec } from './product.model.js';

export interface ProductEntity {
  id: string;
  name: string;
  images: string[];
  price: number;
  description: string;
  specs: ProductSpec[];
  categoryId: string;
  inventoryQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface ProductSearchParams {
  search?: string;
  categoryId?: string;
  inStock?: boolean;
  sort?: 'priceLowHigh' | 'priceHighLow';
  skip: number;
  limit: number;
}

export interface StockLine {
  productId: string;
  quantity: number;
}

export interface StockAdjustmentResult {
  ok: boolean;
  failedProductId?: string;
}

export interface ProductRepository {
  search(params: ProductSearchParams): Promise<{ items: ProductEntity[]; total: number }>;
  findById(id: string): Promise<ProductEntity | null>;
  // Unfiltered by isActive — order placement needs to tell "unknown" apart from "exists but
  // inactive" (both map to PRODUCT_UNAVAILABLE, but the service decides that, not the repo).
  findManyByIds(ids: string[], session?: ClientSession): Promise<ProductEntity[]>;
  // Atomic per line via a $gte guard; stops at the first line that can't be satisfied so the
  // caller's surrounding transaction rolls back any earlier decrements in the same call.
  decrementStock(lines: StockLine[], session: ClientSession): Promise<StockAdjustmentResult>;
  restock(lines: StockLine[], session: ClientSession): Promise<void>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toEntity(doc: HydratedDocument<ProductSchemaType>): ProductEntity {
  return {
    id: doc._id,
    name: doc.name,
    images: doc.images,
    price: doc.price,
    description: doc.description,
    specs: doc.specs.map((spec) => ({ label: spec.label, value: spec.value })),
    categoryId: doc.categoryId,
    inventoryQuantity: doc.inventoryQuantity,
    lowStockThreshold: doc.lowStockThreshold,
    isActive: doc.isActive,
  };
}

export class MongoProductRepository implements ProductRepository {
  async search(params: ProductSearchParams): Promise<{ items: ProductEntity[]; total: number }> {
    const filter: FilterQuery<ProductSchemaType> = { isActive: true };
    if (params.categoryId) filter.categoryId = params.categoryId;
    if (params.search) filter.name = { $regex: escapeRegExp(params.search), $options: 'i' };
    if (params.inStock) filter.inventoryQuantity = { $gt: 0 };

    const sort: Record<string, 1 | -1> = {};
    if (params.sort === 'priceLowHigh') sort.price = 1;
    else if (params.sort === 'priceHighLow') sort.price = -1;

    const [docs, total] = await Promise.all([
      ProductModel.find(filter).sort(sort).skip(params.skip).limit(params.limit),
      ProductModel.countDocuments(filter),
    ]);

    return { items: docs.map(toEntity), total };
  }

  async findById(id: string): Promise<ProductEntity | null> {
    const doc = await ProductModel.findOne({ _id: id, isActive: true });
    return doc ? toEntity(doc) : null;
  }

  async findManyByIds(ids: string[], session?: ClientSession): Promise<ProductEntity[]> {
    const docs = await ProductModel.find({ _id: { $in: ids } }).session(session ?? null);
    return docs.map(toEntity);
  }

  async decrementStock(lines: StockLine[], session: ClientSession): Promise<StockAdjustmentResult> {
    for (const line of lines) {
      const result = await ProductModel.updateOne(
        { _id: line.productId, inventoryQuantity: { $gte: line.quantity } },
        { $inc: { inventoryQuantity: -line.quantity } },
        { session },
      );
      if (result.matchedCount === 0) {
        return { ok: false, failedProductId: line.productId };
      }
    }
    return { ok: true };
  }

  async restock(lines: StockLine[], session: ClientSession): Promise<void> {
    for (const line of lines) {
      await ProductModel.updateOne(
        { _id: line.productId },
        { $inc: { inventoryQuantity: line.quantity } },
        { session },
      );
    }
  }
}
