import { afterEach, describe, expect, it, vi } from "vitest";
import { RequestStatus } from "@/lib/types/request";
import {
  batchDeleteRequests,
  batchPatchStatus,
  fetchItemRequests,
  patchItemStatus,
  putItemRequest,
  requestsQueryKey,
} from "@/lib/api/requests";

const sampleRequest = {
  id: "507f1f77bcf86cd799439011",
  requestorName: "Ada",
  itemRequested: "Laptop",
  requestCreatedDate: "2026-01-01T00:00:00.000Z",
  lastEditedDate: null,
  status: RequestStatus.PENDING,
};

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("requestsQueryKey", () => {
  it("builds a stable react-query key", () => {
    expect(requestsQueryKey(2, RequestStatus.APPROVED)).toEqual([
      "item-requests",
      2,
      RequestStatus.APPROVED,
    ]);
  });
});

describe("fetchItemRequests", () => {
  it("fetches with page and optional status filter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockJsonResponse([sampleRequest]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchItemRequests(3, RequestStatus.PENDING);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/request?page=3&status=pending"
    );
    expect(result).toEqual([sampleRequest]);
  });

  it("omits status when filter is all", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockJsonResponse([sampleRequest]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchItemRequests(1, "all");

    expect(fetchMock).toHaveBeenCalledWith("/api/request?page=1");
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse({}, false, 500))
    );
    await expect(fetchItemRequests(1, "all")).rejects.toThrow(
      "Failed to load requests"
    );
  });

  it("throws when the payload shape is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse({ not: "a list" }))
    );
    await expect(fetchItemRequests(1, "all")).rejects.toThrow(
      "Invalid request list"
    );
  });
});

describe("putItemRequest", () => {
  it("PUTs a create payload and parses the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(sampleRequest));
    vi.stubGlobal("fetch", fetchMock);

    const result = await putItemRequest("Ada", "Laptop");

    expect(fetchMock).toHaveBeenCalledWith("/api/request", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestorName: "Ada",
        itemRequested: "Laptop",
      }),
    });
    expect(result).toEqual(sampleRequest);
  });

  it("throws on failed create", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse({}, false, 400))
    );
    await expect(putItemRequest("Ada", "Laptop")).rejects.toThrow(
      "Failed to create request"
    );
  });
});

describe("patchItemStatus", () => {
  it("PATCHes a single status update", async () => {
    const updated = { ...sampleRequest, status: RequestStatus.APPROVED };
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(updated));
    vi.stubGlobal("fetch", fetchMock);

    const result = await patchItemStatus(
      sampleRequest.id,
      RequestStatus.APPROVED
    );

    expect(fetchMock).toHaveBeenCalledWith("/api/request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sampleRequest.id,
        status: RequestStatus.APPROVED,
      }),
    });
    expect(result.status).toBe(RequestStatus.APPROVED);
  });
});

describe("batchPatchStatus", () => {
  it("PATCHes a batch of updates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockJsonResponse([sampleRequest]));
    vi.stubGlobal("fetch", fetchMock);

    const updates = [
      { id: sampleRequest.id, status: RequestStatus.COMPLETED },
    ];
    await batchPatchStatus(updates);

    expect(fetchMock).toHaveBeenCalledWith("/api/request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
  });
});

describe("batchDeleteRequests", () => {
  it("DELETEs ids and returns deletedCount", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockJsonResponse({ deletedCount: 2 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await batchDeleteRequests([sampleRequest.id]);

    expect(fetchMock).toHaveBeenCalledWith("/api/request", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [sampleRequest.id] }),
    });
    expect(result).toEqual({ deletedCount: 2 });
  });
});
