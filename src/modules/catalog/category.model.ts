import { Schema } from 'mongoose';
import { getOrCreateModel } from '../../core/db/model-factory.js';

export interface CategorySchemaType {
  _id: string;
  name: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
}

const categorySchema = new Schema<CategorySchemaType>({
  _id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  iconKey: { type: String, required: true },
  sortOrder: { type: Number, required: true, default: 0 },
  isActive: { type: Boolean, required: true, default: true },
});

export const CategoryModel = getOrCreateModel<CategorySchemaType>('Category', categorySchema);
