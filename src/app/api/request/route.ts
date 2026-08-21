import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { InputException } from "@/lib/errors/inputExceptions";
import { ResponseType } from "@/lib/types/apiResponse";
import {
  BatchDeleteRequest,
  BatchEditStatusRequest,
  CreateItemRequest,
  EditStatusRequest,
} from "@/lib/types/request";
import {
  batchDeleteRequests,
  batchEditStatusRequests,
  createItemRequest,
  editStatusRequest,
  getItemRequests,
} from "@/server/requests";

const JSON_HEADERS = { "Content-Type": "application/json" };

function isBatchEditStatusRequest(
  body: EditStatusRequest | BatchEditStatusRequest
): body is BatchEditStatusRequest {
  return "updates" in body && Array.isArray(body.updates);
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function errorResponse(error: unknown): Response {
  if (error instanceof InputException) {
    return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
  }
  console.error(error);
  return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const statusFilter = requestUrl.searchParams.get("status");
  const pageNumber = parseInt(requestUrl.searchParams.get("page") || "1", 10);

  try {
    const paginatedRequests = await getItemRequests(statusFilter, pageNumber);
    return jsonResponse(paginatedRequests, 200);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const createPayload = (await request.json()) as CreateItemRequest;
    const createdRequest = await createItemRequest(createPayload);
    return jsonResponse(createdRequest, 201);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const patchPayload = (await request.json()) as
      | EditStatusRequest
      | BatchEditStatusRequest;

    if (isBatchEditStatusRequest(patchPayload)) {
      const updatedRequests = await batchEditStatusRequests(patchPayload);
      return jsonResponse(updatedRequests, 200);
    }

    const updatedRequest = await editStatusRequest(patchPayload);
    return jsonResponse(updatedRequest, 200);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const deletePayload = (await request.json()) as BatchDeleteRequest;
    const deleteResult = await batchDeleteRequests(deletePayload);
    return jsonResponse(deleteResult, 200);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}