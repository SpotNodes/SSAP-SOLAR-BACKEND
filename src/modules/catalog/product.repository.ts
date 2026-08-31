import type { FilterQuery, HydratedDocument } from 'mongoose';
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

export interface ProductRepository {
  search(params: ProductSearchParams): Promise<{ items: ProductEntity[]; total: number }>;
  findById(id: string): Promise<ProductEntity | null>;
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
}
