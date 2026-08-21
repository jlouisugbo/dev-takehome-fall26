import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestStatus } from "@/lib/types/request";
import { InvalidInputError } from "@/lib/errors/inputExceptions";
import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";

vi.mock("@/server/db", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const findMock = vi.fn();
const createMock = vi.fn();
const findByIdAndUpdateMock = vi.fn();
const bulkWriteMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("@/server/models/Request", () => ({
  default: {
    find: (...args: unknown[]) => findMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    findByIdAndUpdate: (...args: unknown[]) => findByIdAndUpdateMock(...args),
    bulkWrite: (...args: unknown[]) => bulkWriteMock(...args),
    deleteMany: (...args: unknown[]) => deleteManyMock(...args),
  },
}));

import {
  batchDeleteRequests,
  batchEditStatusRequests,
  createItemRequest,
  editStatusRequest,
  getItemRequests,
} from "@/server/requests";

const VALID_ID = "507f1f77bcf86cd799439011";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

function leanChain(docs: unknown[]) {
  return {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(docs),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getItemRequests", () => {
  it("paginates and maps lean documents", async () => {
    const chain = leanChain([
      {
        _id: { toString: () => VALID_ID },
        requestorName: "Ada",
        itemRequested: "Laptop",
        requestCreatedDate: createdAt,
        lastEditedDate: null,
        status: RequestStatus.PENDING,
      },
    ]);
    findMock.mockReturnValue(chain);

    const result = await getItemRequests(null, 2);

    expect(findMock).toHaveBeenCalledWith({});
    expect(chain.skip).toHaveBeenCalledWith(PAGINATION_PAGE_SIZE);
    expect(chain.limit).toHaveBeenCalledWith(PAGINATION_PAGE_SIZE);
    expect(result).toEqual([
      {
        id: VALID_ID,
        requestorName: "Ada",
        itemRequested: "Laptop",
        requestCreatedDate: createdAt,
        lastEditedDate: null,
        status: RequestStatus.PENDING,
      },
    ]);
  });

  it("applies a valid status filter", async () => {
    const chain = leanChain([]);
    findMock.mockReturnValue(chain);

    await getItemRequests(RequestStatus.APPROVED, 1);

    expect(findMock).toHaveBeenCalledWith({ status: RequestStatus.APPROVED });
  });

  it("rejects invalid page numbers and status filters", async () => {
    await expect(getItemRequests(null, 0)).rejects.toBeInstanceOf(
      InvalidInputError
    );
    await expect(getItemRequests("nope", 1)).rejects.toBeInstanceOf(
      InvalidInputError
    );
  });
});

describe("createItemRequest", () => {
  it("creates a pending request after validation", async () => {
    createMock.mockResolvedValue({
      _id: { toString: () => VALID_ID },
      requestorName: "Ada",
      itemRequested: "Laptop",
      requestCreatedDate: createdAt,
      lastEditedDate: createdAt,
      status: RequestStatus.PENDING,
    });

    const result = await createItemRequest({
      requestorName: " Ada ",
      itemRequested: " Laptop ",
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestorName: "Ada",
        itemRequested: "Laptop",
        status: RequestStatus.PENDING,
      })
    );
    expect(result.id).toBe(VALID_ID);
    expect(result.status).toBe(RequestStatus.PENDING);
  });

  it("rejects invalid create payloads", async () => {
    await expect(
      createItemRequest({ requestorName: "Ab", itemRequested: "X" })
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("editStatusRequest", () => {
  it("updates status and returns the mapped document", async () => {
    findByIdAndUpdateMock.mockResolvedValue({
      _id: { toString: () => VALID_ID },
      requestorName: "Ada",
      itemRequested: "Laptop",
      requestCreatedDate: createdAt,
      lastEditedDate: createdAt,
      status: RequestStatus.APPROVED,
    });

    const result = await editStatusRequest({
      id: VALID_ID,
      status: RequestStatus.APPROVED,
    });

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      VALID_ID,
      expect.objectContaining({ status: RequestStatus.APPROVED }),
      { new: true }
    );
    expect(result.status).toBe(RequestStatus.APPROVED);
  });

  it("rejects missing documents and invalid payloads", async () => {
    findByIdAndUpdateMock.mockResolvedValue(null);
    await expect(
      editStatusRequest({ id: VALID_ID, status: RequestStatus.APPROVED })
    ).rejects.toBeInstanceOf(InvalidInputError);

    await expect(
      editStatusRequest({ id: "bad", status: RequestStatus.APPROVED })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("batchEditStatusRequests", () => {
  it("bulk-writes then reloads updated documents", async () => {
    bulkWriteMock.mockResolvedValue({});
    findMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: { toString: () => VALID_ID },
          requestorName: "Ada",
          itemRequested: "Laptop",
          requestCreatedDate: createdAt,
          lastEditedDate: createdAt,
          status: RequestStatus.COMPLETED,
        },
      ]),
    });

    const result = await batchEditStatusRequests({
      updates: [{ id: VALID_ID, status: RequestStatus.COMPLETED }],
    });

    expect(bulkWriteMock).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(RequestStatus.COMPLETED);
  });

  it("rejects empty batches", async () => {
    await expect(
      batchEditStatusRequests({ updates: [] })
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("batchDeleteRequests", () => {
  it("deletes matching ids and returns deletedCount", async () => {
    deleteManyMock.mockResolvedValue({ deletedCount: 2 });

    const result = await batchDeleteRequests({
      ids: [VALID_ID, "507f1f77bcf86cd799439012"],
    });

    expect(deleteManyMock).toHaveBeenCalledWith({
      _id: { $in: [VALID_ID, "507f1f77bcf86cd799439012"] },
    });
    expect(result).toEqual({ deletedCount: 2 });
  });

  it("rejects invalid delete payloads", async () => {
    await expect(batchDeleteRequests({ ids: [] })).rejects.toBeInstanceOf(
      InvalidInputError
    );
  });
});
