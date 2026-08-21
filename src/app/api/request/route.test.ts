import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestStatus } from "@/lib/types/request";
import { InvalidInputError } from "@/lib/errors/inputExceptions";
import { RESPONSES, ResponseType } from "@/lib/types/apiResponse";

const getItemRequests = vi.fn();
const createItemRequest = vi.fn();
const editStatusRequest = vi.fn();
const batchEditStatusRequests = vi.fn();
const batchDeleteRequests = vi.fn();

vi.mock("@/server/requests", () => ({
  getItemRequests: (...args: unknown[]) => getItemRequests(...args),
  createItemRequest: (...args: unknown[]) => createItemRequest(...args),
  editStatusRequest: (...args: unknown[]) => editStatusRequest(...args),
  batchEditStatusRequests: (...args: unknown[]) =>
    batchEditStatusRequests(...args),
  batchDeleteRequests: (...args: unknown[]) => batchDeleteRequests(...args),
}));

import { DELETE, GET, PATCH, PUT } from "@/app/api/request/route";

const sampleItem = {
  id: "507f1f77bcf86cd799439011",
  requestorName: "Ada",
  itemRequested: "Laptop",
  requestCreatedDate: new Date("2026-01-01T00:00:00.000Z"),
  lastEditedDate: null,
  status: RequestStatus.PENDING,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/request", () => {
  it("returns paginated requests for query params", async () => {
    getItemRequests.mockResolvedValue([sampleItem]);

    const response = await GET(
      new Request("http://localhost/api/request?page=2&status=pending")
    );

    expect(getItemRequests).toHaveBeenCalledWith("pending", 2);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        ...sampleItem,
        requestCreatedDate: sampleItem.requestCreatedDate.toISOString(),
      },
    ]);
  });

  it("defaults page to 1 when omitted", async () => {
    getItemRequests.mockResolvedValue([]);
    await GET(new Request("http://localhost/api/request"));
    expect(getItemRequests).toHaveBeenCalledWith(null, 1);
  });

  it("maps InvalidInputError to 400", async () => {
    getItemRequests.mockRejectedValue(new InvalidInputError("page number"));
    const response = await GET(
      new Request("http://localhost/api/request?page=0")
    );
    expect(response.status).toBe(RESPONSES[ResponseType.INVALID_INPUT].code);
    expect(await response.json()).toEqual({
      message: RESPONSES[ResponseType.INVALID_INPUT].message,
    });
  });
});

describe("PUT /api/request", () => {
  it("creates a request and returns 201", async () => {
    createItemRequest.mockResolvedValue(sampleItem);
    const response = await PUT(
      new Request("http://localhost/api/request", {
        method: "PUT",
        body: JSON.stringify({
          requestorName: "Ada",
          itemRequested: "Laptop",
        }),
      })
    );

    expect(createItemRequest).toHaveBeenCalledWith({
      requestorName: "Ada",
      itemRequested: "Laptop",
    });
    expect(response.status).toBe(201);
  });
});

describe("PATCH /api/request", () => {
  it("routes single edits to editStatusRequest", async () => {
    editStatusRequest.mockResolvedValue({
      ...sampleItem,
      status: RequestStatus.APPROVED,
    });

    const response = await PATCH(
      new Request("http://localhost/api/request", {
        method: "PATCH",
        body: JSON.stringify({
          id: sampleItem.id,
          status: RequestStatus.APPROVED,
        }),
      })
    );

    expect(editStatusRequest).toHaveBeenCalledWith({
      id: sampleItem.id,
      status: RequestStatus.APPROVED,
    });
    expect(batchEditStatusRequests).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("routes batch edits to batchEditStatusRequests", async () => {
    batchEditStatusRequests.mockResolvedValue([sampleItem]);
    const payload = {
      updates: [{ id: sampleItem.id, status: RequestStatus.COMPLETED }],
    };

    const response = await PATCH(
      new Request("http://localhost/api/request", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    );

    expect(batchEditStatusRequests).toHaveBeenCalledWith(payload);
    expect(editStatusRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

describe("DELETE /api/request", () => {
  it("deletes by ids and returns deletedCount", async () => {
    batchDeleteRequests.mockResolvedValue({ deletedCount: 1 });

    const response = await DELETE(
      new Request("http://localhost/api/request", {
        method: "DELETE",
        body: JSON.stringify({ ids: [sampleItem.id] }),
      })
    );

    expect(batchDeleteRequests).toHaveBeenCalledWith({
      ids: [sampleItem.id],
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deletedCount: 1 });
  });

  it("maps unknown errors to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    batchDeleteRequests.mockRejectedValue(new Error("boom"));

    const response = await DELETE(
      new Request("http://localhost/api/request", {
        method: "DELETE",
        body: JSON.stringify({ ids: [sampleItem.id] }),
      })
    );

    expect(response.status).toBe(RESPONSES[ResponseType.UNKNOWN_ERROR].code);
    errorSpy.mockRestore();
  });
});
