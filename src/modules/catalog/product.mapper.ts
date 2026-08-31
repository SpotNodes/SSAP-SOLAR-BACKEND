import { StockStatus } from '../../core/enums.js';
import type { ProductEntity } from './product.repository.js';
import type { ProductSpec } from './product.model.js';

export interface PublicProduct {
  id: string;
  name: string;
  images: string[];
  price: number;
  description: string;
  specs: ProductSpec[];
  categoryId: string;
  stockStatus: StockStatus;
}

// Server-owned derivation (PRD §6.2) — the raw quantity/threshold never reach the customer payload.
export function deriveStockStatus(quantity: number, threshold: number): StockStatus {
  if (quantity <= 0) return StockStatus.OutOfStock;
  if (quantity <= threshold) return StockStatus.LowStock;
  return StockStatus.InStock;
}

export function toPublicProduct(product: ProductEntity): PublicProduct {
  return {
    id: product.id,
    name: product.name,
    images: product.images,
    price: product.price,
    description: product.description,
    specs: product.specs,
    categoryId: product.categoryId,
    stockStatus: deriveStockStatus(product.inventoryQuantity, product.lowStockThreshold),
  };
}
