import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import { InvalidInputError } from "@/lib/errors/inputExceptions";
import {
  BatchDeleteRequest,
  BatchEditStatusRequest,
  CreateItemRequest,
  EditStatusRequest,
  ItemRequest,
  RequestStatus,
} from "@/lib/types/request";
import {
  isValidStatus,
  validateBatchDeleteRequest,
  validateBatchEditStatusRequest,
  validateCreateItemRequest,
  validateEditStatusRequest,
} from "@/lib/validation/requests";
import dbConnect from "@/server/db";
import RequestModel, { type RequestDoc } from "@/server/models/Request";
import type { HydratedDocument, Types } from "mongoose";

type LeanRequestDocument = RequestDoc & { _id: Types.ObjectId };

export interface BatchDeleteResult {
  deletedCount: number;
}

function toItemRequest(
  document: HydratedDocument<RequestDoc> | LeanRequestDocument
): ItemRequest {
  return {
    id: document._id.toString(),
    requestorName: document.requestorName,
    itemRequested: document.itemRequested,
    requestCreatedDate: document.requestCreatedDate,
    lastEditedDate: document.lastEditedDate ?? null,
    status: document.status as RequestStatus,
  };
}

export async function getItemRequests(
  statusFilter: string | null,
  pageNumber: number
): Promise<ItemRequest[]> {
  await dbConnect();

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new InvalidInputError("page number");
  }

  const mongoFilter: { status?: RequestStatus } = {};
  if (statusFilter) {
    if (!isValidStatus(statusFilter)) {
      throw new InvalidInputError("status filter");
    }
    mongoFilter.status = statusFilter;
  }

  const documents = await RequestModel.find(mongoFilter)
    .sort({ requestCreatedDate: -1 })
    .skip((pageNumber - 1) * PAGINATION_PAGE_SIZE)
    .limit(PAGINATION_PAGE_SIZE)
    .lean<LeanRequestDocument[]>();

  return documents.map(toItemRequest);
}

export async function createItemRequest(
  createPayload: CreateItemRequest
): Promise<ItemRequest> {
  await dbConnect();
  const validatedPayload = validateCreateItemRequest(createPayload);
  if (!validatedPayload) {
    throw new InvalidInputError("created item request");
  }

  const now = new Date();
  const createdDocument = await RequestModel.create({
    ...validatedPayload,
    requestCreatedDate: now,
    lastEditedDate: now,
    status: RequestStatus.PENDING,
  });

  return toItemRequest(createdDocument);
}

export async function editStatusRequest(
  editPayload: EditStatusRequest
): Promise<ItemRequest> {
  await dbConnect();
  const validatedPayload = validateEditStatusRequest(editPayload);
  if (!validatedPayload) {
    throw new InvalidInputError("edit item request");
  }

  const updatedDocument = await RequestModel.findByIdAndUpdate(
    validatedPayload.id,
    {
      status: validatedPayload.status,
      lastEditedDate: new Date(),
    },
    { new: true }
  );

  if (!updatedDocument) {
    throw new InvalidInputError("edit item ID");
  }

  return toItemRequest(updatedDocument);
}

export async function batchEditStatusRequests(
  batchEditPayload: BatchEditStatusRequest
): Promise<ItemRequest[]> {
  await dbConnect();
  const validatedPayload = validateBatchEditStatusRequest(batchEditPayload);
  if (!validatedPayload) {
    throw new InvalidInputError("batch edit requests");
  }

  const editedAt = new Date();
  await RequestModel.bulkWrite(
    validatedPayload.updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id },
        update: {
          $set: { status: update.status, lastEditedDate: editedAt },
        },
      },
    }))
  );

  const updatedIds = validatedPayload.updates.map((update) => update.id);
  const documents = await RequestModel.find({
    _id: { $in: updatedIds },
  }).lean<LeanRequestDocument[]>();

  return documents.map(toItemRequest);
}

export async function batchDeleteRequests(
  batchDeletePayload: BatchDeleteRequest
): Promise<BatchDeleteResult> {
  await dbConnect();
  const validatedPayload = validateBatchDeleteRequest(batchDeletePayload);
  if (!validatedPayload) {
    throw new InvalidInputError("batch delete requests");
  }

  const deleteResult = await RequestModel.deleteMany({
    _id: { $in: validatedPayload.ids },
  });

  return { deletedCount: deleteResult.deletedCount ?? 0 };
}