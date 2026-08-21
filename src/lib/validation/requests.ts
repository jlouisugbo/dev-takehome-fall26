import {
  CreateItemRequest,
  EditStatusRequest,
  RequestStatus,
  BatchEditStatusRequest,
  BatchDeleteRequest,
} from "@/lib/types/request";
import mongoose from "mongoose";

const REQUEST_STATUSES: RequestStatus[] = [
  RequestStatus.PENDING,
  RequestStatus.APPROVED,
  RequestStatus.COMPLETED,
  RequestStatus.REJECTED,
];

function isValidString(value: string, lower: number, upper: number): boolean {
  const trimmed = value.trim();
  return trimmed.length >= lower && trimmed.length <= upper;
}

export function isValidStatus(status: string): status is RequestStatus {
  return REQUEST_STATUSES.some((s) => s === status);
}

export function isValidId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export function validateCreateItemRequest(
  request: CreateItemRequest
): CreateItemRequest | null {
  if (
    !isValidString(request.requestorName, 3, 30) ||
    !isValidString(request.itemRequested, 2, 100)
  ) {
    return null;
  }
  return {
    requestorName: request.requestorName.trim(),
    itemRequested: request.itemRequested.trim(),
  };
}

export function validateEditStatusRequest(
  request: EditStatusRequest
): EditStatusRequest | null {
  if (!isValidId(request.id) || !isValidStatus(request.status)) {
    return null;
  }
  return request;
}

export function validateBatchEditStatusRequest(
  request: BatchEditStatusRequest
): BatchEditStatusRequest | null {
  if (!Array.isArray(request.updates) || request.updates.length === 0) {
    return null;
  }
  const updates: EditStatusRequest[] = [];
  for (const item of request.updates) {
    const validated = validateEditStatusRequest(item);
    if (!validated) return null;
    updates.push(validated);
  }
  return { updates };
}

export function validateBatchDeleteRequest(
  request: BatchDeleteRequest
): BatchDeleteRequest | null {
  if (!Array.isArray(request.ids) || request.ids.length === 0) return null;
  if (!request.ids.every(isValidId)) return null;
  return request;
}