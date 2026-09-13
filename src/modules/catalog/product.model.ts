import { Schema } from 'mongoose';
import { StockStatus } from '../../core/enums.js';
import { getOrCreateModel } from '../../core/db/model-factory.js';

export interface ProductSpec {
  label: string;
  value: string;
}

/**
 * A selectable option of a product (e.g. a 585W panel, or the "Hybrid" inverter build).
 * `price` and `stockStatus` are optional: when omitted the option inherits the parent
 * product's. Mirrors the app's `ProductVariant` type so the DTO maps 1:1.
 */
export interface ProductVariant {
  id: string;
  label: string;
  price?: number;
  stockStatus?: StockStatus;
}

export interface ProductSchemaType {
  _id: string;
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
  updatedAt: Date;
}

const productSpecSchema = new Schema<ProductSpec>(
  { label: { type: String, required: true }, value: { type: String, required: true } },
  { _id: false },
);

const productVariantSchema = new Schema<ProductVariant>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    price: { type: Number, required: false, min: 0 },
    stockStatus: { type: String, required: false, enum: Object.values(StockStatus) },
  },
  { _id: false },
);

const productSchema = new Schema<ProductSchemaType>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    images: { type: [String], required: true, default: [] },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    specs: { type: [productSpecSchema], required: true, default: [] },
    variantLabel: { type: String, required: false },
    variants: { type: [productVariantSchema], required: false },
    categoryId: { type: String, required: true },
    inventoryQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 5 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

productSchema.index({ categoryId: 1, isActive: 1 });

export const ProductModel = getOrCreateModel<ProductSchemaType>('Product', productSchema);
