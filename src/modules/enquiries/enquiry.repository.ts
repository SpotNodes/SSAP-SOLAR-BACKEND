import { isValidObjectId, type FilterQuery } from 'mongoose';
import { escapeRegExp } from '../../core/db/regex-escape.js';
import type { EnquirySource, EnquiryStatus } from './enquiry-enums.js';
import { EnquiryModel, type EnquirySchemaType } from './enquiry.model.js';

export interface EnquiryEntity {
  id: string;
  productId?: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  requirement?: string;
  quantity?: number;
  source: EnquirySource;
  status: EnquiryStatus;
  internalNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEnquiryData {
  productId?: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  requirement?: string;
  quantity?: number;
  source: EnquirySource;
}

export interface UpdateEnquiryData {
  status?: EnquiryStatus;
  internalNote?: string;
}

export interface AdminEnquirySearchParams {
  status?: EnquiryStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  skip: number;
  limit: number;
}

function toEntity(doc: {
  _id: unknown;
  productId?: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  requirement?: string;
  quantity?: number;
  source: EnquirySource;
  status: EnquiryStatus;
  internalNote?: string;
  createdAt: Date;
  updatedAt: Date;
}): EnquiryEntity {
  return {
    id: String(doc._id),
    productId: doc.productId,
    name: doc.name,
    mobile: doc.mobile,
    email: doc.email,
    message: doc.message,
    requirement: doc.requirement,
    quantity: doc.quantity,
    source: doc.source,
    status: doc.status,
    internalNote: doc.internalNote,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface EnquiryRepository {
  create(data: CreateEnquiryData): Promise<EnquiryEntity>;
  findById(id: string): Promise<EnquiryEntity | null>;
  searchAdmin(params: AdminEnquirySearchParams): Promise<{ items: EnquiryEntity[]; total: number }>;
  update(id: string, data: UpdateEnquiryData): Promise<EnquiryEntity | null>;
}

export class MongoEnquiryRepository implements EnquiryRepository {
  async create(data: CreateEnquiryData): Promise<EnquiryEntity> {
    const doc = await EnquiryModel.create(data);
    return toEntity(doc);
  }

  async findById(id: string): Promise<EnquiryEntity | null> {
    // findById() rejects with a CastError (not a clean null) for a malformed id — this repo is
    // reachable with an arbitrary URL param, unlike Order/Product/Category which use custom
    // string _ids immune to this.
    if (!isValidObjectId(id)) return null;
    const doc = await EnquiryModel.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async searchAdmin(
    params: AdminEnquirySearchParams,
  ): Promise<{ items: EnquiryEntity[]; total: number }> {
    const filter: FilterQuery<EnquirySchemaType> = {};
    if (params.status) filter.status = params.status;
    if (params.dateFrom || params.dateTo) {
      filter.createdAt = {};
      if (params.dateFrom) filter.createdAt.$gte = params.dateFrom;
      if (params.dateTo) filter.createdAt.$lte = params.dateTo;
    }
    if (params.search) {
      const regex = { $regex: escapeRegExp(params.search), $options: 'i' };
      filter.$or = [{ name: regex }, { mobile: regex }, { email: regex }];
    }

    const [docs, total] = await Promise.all([
      EnquiryModel.find(filter).sort({ createdAt: -1 }).skip(params.skip).limit(params.limit),
      EnquiryModel.countDocuments(filter),
    ]);

    return { items: docs.map(toEntity), total };
  }

  async update(id: string, data: UpdateEnquiryData): Promise<EnquiryEntity | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await EnquiryModel.findByIdAndUpdate(id, data, { new: true });
    return doc ? toEntity(doc) : null;
  }
}
