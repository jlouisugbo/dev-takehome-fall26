import { ItemRequestJSON, RequestStatus } from "@/lib/types/request";

export type StatusFilter = "all" | RequestStatus;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStatus(value: unknown): value is RequestStatus {
  return (
    typeof value === "string" &&
    (Object.values(RequestStatus) as string[]).includes(value)
  );
}

function parseItemRequest(value: unknown): ItemRequestJSON {
  if (!isRecord(value)) throw new Error("Invalid request");
  if (typeof value.id !== "string") throw new Error("Invalid request id");
  if (typeof value.requestorName !== "string") throw new Error("Invalid name");
  if (typeof value.itemRequested !== "string") throw new Error("Invalid item");
  if (typeof value.requestCreatedDate !== "string") {
    throw new Error("Invalid created date");
  }
  if (value.lastEditedDate !== null && typeof value.lastEditedDate !== "string") {
    throw new Error("Invalid edited date");
  }
  if (!isStatus(value.status)) throw new Error("Invalid status");

  return {
    id: value.id,
    requestorName: value.requestorName,
    itemRequested: value.itemRequested,
    requestCreatedDate: value.requestCreatedDate,
    lastEditedDate: value.lastEditedDate,
    status: value.status,
  };
}

function parseItemRequestList(value: unknown): ItemRequestJSON[] {
  if (!Array.isArray(value)) throw new Error("Invalid request list");
  return value.map(parseItemRequest);
}

export function requestsQueryKey(page: number, filter: StatusFilter) {
  return ["item-requests", page, filter] as const;
}

export async function fetchItemRequests(
  page: number,
  filter: StatusFilter
): Promise<ItemRequestJSON[]> {
  const params = new URLSearchParams({ page: String(page) });
  if (filter !== "all") params.set("status", filter);

  const res = await fetch(`/api/request?${params}`);
  if (!res.ok) throw new Error("Failed to load requests");
  return parseItemRequestList(await res.json());
}

export async function putItemRequest(
  requestorName: string,
  itemRequested: string
): Promise<ItemRequestJSON> {
  const res = await fetch("/api/request", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestorName, itemRequested }),
  });
  if (!res.ok) throw new Error("Failed to create request");
  return parseItemRequest(await res.json());
}

export async function patchItemStatus(
  id: string,
  status: RequestStatus
): Promise<ItemRequestJSON> {
  const res = await fetch("/api/request", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return parseItemRequest(await res.json());
}

export async function batchPatchStatus(
  updates: { id: string; status: RequestStatus }[]
): Promise<ItemRequestJSON[]> {
  const res = await fetch("/api/request", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) throw new Error("Failed to batch update");
  return parseItemRequestList(await res.json());
}

export async function batchDeleteRequests(
  ids: string[]
): Promise<{ deletedCount: number }> {
  const res = await fetch("/api/request", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to batch delete");
  const body: { deletedCount: number } = await res.json();
  return body;
}