import type { ClientSession, FilterQuery, HydratedDocument } from 'mongoose';
import { escapeRegExp } from '../../core/db/regex-escape.js';
import {
  ProductModel,
  type ProductSchemaType,
  type ProductSpec,
  type ProductVariant,
} from './product.model.js';

export interface ProductEntity {
  id: string;
  name: string;
  images: string[];
  price: number;
  description: string;
  specs: ProductSpec[];
  variantLabel?: string;
  variants?: ProductVariant[];
  categoryId: string;
  inventoryQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
}

export type ProductSort = 'priceLowHigh' | 'priceHighLow' | 'newest' | 'bestSelling';

export interface ProductSearchParams {
  search?: string;
  categoryId?: string;
  inStock?: boolean;
  sort?: ProductSort;
  /**
   * Product ids in descending sales rank, supplied by the service for
   * `sort: 'bestSelling'`. The repo cannot compute this itself — sales live in
   * the orders collection, which catalog must not reach into directly.
   */
  rankedIds?: string[];
  skip: number;
  limit: number;
}

export interface AdminProductSearchParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  skip: number;
  limit: number;
}

export interface CreateProductData {
  id: string;
  name: string;
  images: string[];
  price: number;
  description: string;
  specs: ProductSpec[];
  variantLabel?: string;
  variants?: ProductVariant[];
  categoryId: string;
  inventoryQuantity: number;
  lowStockThreshold: number;
}

export interface UpdateProductData {
  name?: string;
  images?: string[];
  price?: number;
  description?: string;
  specs?: ProductSpec[];
  categoryId?: string;
  isActive?: boolean;
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

  // Admin operations — unscoped by isActive, since admin must be able to see/edit/reactivate
  // soft-deleted products the customer-facing search deliberately excludes.
  findByIdAdmin(id: string): Promise<ProductEntity | null>;
  searchAdmin(params: AdminProductSearchParams): Promise<{ items: ProductEntity[]; total: number }>;
  create(data: CreateProductData): Promise<ProductEntity>;
  update(id: string, data: UpdateProductData): Promise<ProductEntity | null>;
  softDelete(id: string): Promise<ProductEntity | null>;
  setInventory(
    id: string,
    data: { inventoryQuantity?: number; lowStockThreshold?: number },
  ): Promise<ProductEntity | null>;
}

function toEntity(doc: HydratedDocument<ProductSchemaType>): ProductEntity {
  return {
    id: doc._id,
    name: doc.name,
    images: doc.images,
    price: doc.price,
    description: doc.description,
    specs: doc.specs.map((spec) => ({ label: spec.label, value: spec.value })),
    ...(doc.variantLabel ? { variantLabel: doc.variantLabel } : {}),
    ...(doc.variants && doc.variants.length > 0
      ? {
          variants: doc.variants.map((v) => ({
            id: v.id,
            label: v.label,
            ...(v.price != null ? { price: v.price } : {}),
            ...(v.stockStatus ? { stockStatus: v.stockStatus } : {}),
          })),
        }
      : {}),
    categoryId: doc.categoryId,
    inventoryQuantity: doc.inventoryQuantity,
    lowStockThreshold: doc.lowStockThreshold,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
  };
}

export class MongoProductRepository implements ProductRepository {
  async search(params: ProductSearchParams): Promise<{ items: ProductEntity[]; total: number }> {
    const filter: FilterQuery<ProductSchemaType> = { isActive: true };
    if (params.categoryId) filter.categoryId = params.categoryId;
    if (params.search) filter.name = { $regex: escapeRegExp(params.search), $options: 'i' };
    if (params.inStock) filter.inventoryQuantity = { $gt: 0 };

    // Best-selling is ranked by an array the service computed from orders, which
    // Mongo cannot sort by. Page it in memory: the ranked list is capped at a
    // few dozen ids, so this never walks the whole catalogue.
    if (params.sort === 'bestSelling') {
      const rank = new Map((params.rankedIds ?? []).map((id, index) => [id, index]));
      const docs = await ProductModel.find(filter).sort({ createdAt: -1 });
      const sorted = docs.sort((a, b) => {
        const ra = rank.get(a._id) ?? Number.MAX_SAFE_INTEGER;
        const rb = rank.get(b._id) ?? Number.MAX_SAFE_INTEGER;
        return ra - rb;
      });
      return {
        items: sorted.slice(params.skip, params.skip + params.limit).map(toEntity),
        total: sorted.length,
      };
    }

    const sort: Record<string, 1 | -1> = {};
    if (params.sort === 'priceLowHigh') sort.price = 1;
    else if (params.sort === 'priceHighLow') sort.price = -1;
    else if (params.sort === 'newest') sort.createdAt = -1;

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

  async findByIdAdmin(id: string): Promise<ProductEntity | null> {
    const doc = await ProductModel.findOne({ _id: id });
    return doc ? toEntity(doc) : null;
  }

  async searchAdmin(
    params: AdminProductSearchParams,
  ): Promise<{ items: ProductEntity[]; total: number }> {
    const filter: FilterQuery<ProductSchemaType> = {};
    if (params.categoryId) filter.categoryId = params.categoryId;
    if (params.isActive !== undefined) filter.isActive = params.isActive;
    if (params.search) filter.name = { $regex: escapeRegExp(params.search), $options: 'i' };

    const [docs, total] = await Promise.all([
      ProductModel.find(filter).sort({ _id: 1 }).skip(params.skip).limit(params.limit),
      ProductModel.countDocuments(filter),
    ]);

    return { items: docs.map(toEntity), total };
  }

  async create(data: CreateProductData): Promise<ProductEntity> {
    const { id, ...rest } = data;
    const doc = await ProductModel.create({ _id: id, ...rest, isActive: true });
    return toEntity(doc);
  }

  async update(id: string, data: UpdateProductData): Promise<ProductEntity | null> {
    const doc = await ProductModel.findOneAndUpdate({ _id: id }, data, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async softDelete(id: string): Promise<ProductEntity | null> {
    const doc = await ProductModel.findOneAndUpdate({ _id: id }, { isActive: false }, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async setInventory(
    id: string,
    data: { inventoryQuantity?: number; lowStockThreshold?: number },
  ): Promise<ProductEntity | null> {
    const doc = await ProductModel.findOneAndUpdate({ _id: id }, data, { new: true });
    return doc ? toEntity(doc) : null;
  }
}
