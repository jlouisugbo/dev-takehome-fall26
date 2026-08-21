import { describe, expect, it } from "vitest";
import { RequestStatus } from "@/lib/types/request";
import {
  isValidId,
  isValidStatus,
  validateBatchDeleteRequest,
  validateBatchEditStatusRequest,
  validateCreateItemRequest,
  validateEditStatusRequest,
} from "@/lib/validation/requests";

const VALID_ID = "507f1f77bcf86cd799439011";

describe("isValidStatus", () => {
  it.each(Object.values(RequestStatus))("accepts %s", (status) => {
    expect(isValidStatus(status)).toBe(true);
  });

  it("rejects unknown statuses", () => {
    expect(isValidStatus("cancelled")).toBe(false);
    expect(isValidStatus("")).toBe(false);
  });
});

describe("isValidId", () => {
  it("accepts a valid ObjectId string", () => {
    expect(isValidId(VALID_ID)).toBe(true);
  });

  it("rejects invalid ObjectId strings", () => {
    expect(isValidId("not-an-id")).toBe(false);
    expect(isValidId("")).toBe(false);
  });
});

describe("validateCreateItemRequest", () => {
  it("trims and returns valid payloads", () => {
    expect(
      validateCreateItemRequest({
        requestorName: "  Ada  ",
        itemRequested: "  Laptop  ",
      })
    ).toEqual({ requestorName: "Ada", itemRequested: "Laptop" });
  });

  it("rejects names shorter than 3 chars after trim", () => {
    expect(
      validateCreateItemRequest({
        requestorName: "Ab",
        itemRequested: "Laptop",
      })
    ).toBeNull();
  });

  it("rejects names longer than 30 chars", () => {
    expect(
      validateCreateItemRequest({
        requestorName: "A".repeat(31),
        itemRequested: "Laptop",
      })
    ).toBeNull();
  });

  it("rejects items shorter than 2 chars after trim", () => {
    expect(
      validateCreateItemRequest({
        requestorName: "Ada",
        itemRequested: "X",
      })
    ).toBeNull();
  });

  it("rejects items longer than 100 chars", () => {
    expect(
      validateCreateItemRequest({
        requestorName: "Ada",
        itemRequested: "X".repeat(101),
      })
    ).toBeNull();
  });
});

describe("validateEditStatusRequest", () => {
  it("returns the payload when id and status are valid", () => {
    const payload = { id: VALID_ID, status: RequestStatus.APPROVED };
    expect(validateEditStatusRequest(payload)).toEqual(payload);
  });

  it("rejects invalid ids or statuses", () => {
    expect(
      validateEditStatusRequest({
        id: "bad",
        status: RequestStatus.PENDING,
      })
    ).toBeNull();
    expect(
      validateEditStatusRequest({
        id: VALID_ID,
        status: "nope" as RequestStatus,
      })
    ).toBeNull();
  });
});

describe("validateBatchEditStatusRequest", () => {
  it("validates every update in the batch", () => {
    const payload = {
      updates: [
        { id: VALID_ID, status: RequestStatus.APPROVED },
        { id: "507f1f77bcf86cd799439012", status: RequestStatus.REJECTED },
      ],
    };
    expect(validateBatchEditStatusRequest(payload)).toEqual(payload);
  });

  it("rejects empty or non-array updates", () => {
    expect(validateBatchEditStatusRequest({ updates: [] })).toBeNull();
    expect(
      validateBatchEditStatusRequest({
        updates: null as unknown as [],
      })
    ).toBeNull();
  });

  it("rejects the whole batch if any update is invalid", () => {
    expect(
      validateBatchEditStatusRequest({
        updates: [
          { id: VALID_ID, status: RequestStatus.APPROVED },
          { id: "bad", status: RequestStatus.PENDING },
        ],
      })
    ).toBeNull();
  });
});

describe("validateBatchDeleteRequest", () => {
  it("accepts a non-empty list of valid ids", () => {
    const payload = { ids: [VALID_ID, "507f1f77bcf86cd799439012"] };
    expect(validateBatchDeleteRequest(payload)).toEqual(payload);
  });

  it("rejects empty lists or invalid ids", () => {
    expect(validateBatchDeleteRequest({ ids: [] })).toBeNull();
    expect(validateBatchDeleteRequest({ ids: ["bad"] })).toBeNull();
    expect(
      validateBatchDeleteRequest({ ids: null as unknown as string[] })
    ).toBeNull();
  });
});
