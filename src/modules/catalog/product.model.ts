import { Schema } from 'mongoose';
import { getOrCreateModel } from '../../core/db/model-factory.js';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductSchemaType {
  _id: string;
  name: string;
  images: string[];
  price: number;
  description: string;
  specs: ProductSpec[];
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

const productSchema = new Schema<ProductSchemaType>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    images: { type: [String], required: true, default: [] },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    specs: { type: [productSpecSchema], required: true, default: [] },
    categoryId: { type: String, required: true },
    inventoryQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 5 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

productSchema.index({ categoryId: 1, isActive: 1 });

export const ProductModel = getOrCreateModel<ProductSchemaType>('Product', productSchema);
