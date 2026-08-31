import type { CategoryEntity } from './category.repository.js';

export interface PublicCategory {
  id: string;
  name: string;
  iconKey: string;
}

export function toPublicCategory(category: CategoryEntity): PublicCategory {
  return { id: category.id, name: category.name, iconKey: category.iconKey };
}
