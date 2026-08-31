import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { buildMeta, toPaginationParams } from '../../core/pagination/pagination.js';
import { sendOk, sendPaginated } from '../../core/response/envelope.js';
import { toAdminProduct } from './admin-product.mapper.js';
import type {
  AdminProductQuery,
  CreateProductBody,
  SetInventoryBody,
  UpdateProductBody,
} from './admin-product.schema.js';

export async function listProducts(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as AdminProductQuery;
  const { page, pageSize, skip } = toPaginationParams(query);

  const { items, total } = await container.adminProductService.search({
    search: query.search,
    categoryId: query.categoryId,
    isActive: query.isActive,
    skip,
    limit: pageSize,
  });

  sendPaginated(res, items.map(toAdminProduct), buildMeta(total, page, pageSize));
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const product = await container.adminProductService.getById(req.params.id as string);
  sendOk(res, toAdminProduct(product));
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateProductBody;
  const product = await container.adminProductService.create(body);
  sendOk(res, toAdminProduct(product), 201);
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateProductBody;
  const product = await container.adminProductService.update(req.params.id as string, body);
  sendOk(res, toAdminProduct(product));
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  await container.adminProductService.softDelete(req.params.id as string);
  res.status(204).end();
}

export async function setProductInventory(req: Request, res: Response): Promise<void> {
  const body = req.body as SetInventoryBody;
  const product = await container.adminProductService.setInventory(req.params.id as string, body);
  sendOk(res, toAdminProduct(product));
}
