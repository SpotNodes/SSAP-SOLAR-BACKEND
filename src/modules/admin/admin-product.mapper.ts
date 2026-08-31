import { deriveStockStatus } from '../catalog/product.mapper.js';
import type { ProductEntity } from '../catalog/product.repository.js';
import type { StockStatus } from '../../core/enums.js';

// Unlike the customer-facing PublicProduct, admins see the raw inventory numbers and isActive —
// that's the whole point of the inventory management screen.
export interface AdminProduct extends ProductEntity {
  stockStatus: StockStatus;
}

export function toAdminProduct(product: ProductEntity): AdminProduct {
  return {
    ...product,
    stockStatus: deriveStockStatus(product.inventoryQuantity, product.lowStockThreshold),
  };
}
