export enum RequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  COMPLETED = "completed",
  REJECTED = "rejected",
}

export interface ItemRequest {
  id: string;
  requestorName: string;
  itemRequested: string;
  requestCreatedDate: Date;
  lastEditedDate: Date | null;
  status: RequestStatus;
}

export interface CreateItemRequest {
  requestorName: string;
  itemRequested: string;
}

export interface EditStatusRequest {
  id: string;
  status: RequestStatus;
}

export interface ItemRequestJSON {
  id: string;
  requestorName: string;
  itemRequested: string;
  requestCreatedDate: string;
  lastEditedDate: string | null;
  status: RequestStatus;
}

export interface BatchEditStatusRequest {
  updates: EditStatusRequest[];
}

export interface BatchDeleteRequest {
  ids: string[];
}