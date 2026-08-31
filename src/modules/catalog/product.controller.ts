import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { buildMeta, toPaginationParams } from '../../core/pagination/pagination.js';
import { sendOk, sendPaginated } from '../../core/response/envelope.js';
import { toPublicProduct } from './product.mapper.js';
import type { ProductQuery } from './product.schema.js';

export async function getProducts(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ProductQuery;
  const { page, pageSize, skip } = toPaginationParams(query);

  const { items, total } = await container.productService.search({
    search: query.search,
    categoryId: query.categoryId,
    inStock: query.inStock,
    sort: query.sort,
    skip,
    limit: pageSize,
  });

  sendPaginated(res, items.map(toPublicProduct), buildMeta(total, page, pageSize));
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const product = await container.productService.getById(req.params.id as string);
  sendOk(res, toPublicProduct(product));
}
