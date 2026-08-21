import { RequestStatus } from "../request";

export interface MockItemRequest {
  id: number;
  requestorName: string;
  itemRequested: string;
  requestCreatedDate: Date;
  lastEditedDate: Date | null;
  status: RequestStatus;
}

export interface MockCreateItemRequest {
  requestorName: string;
  itemRequested: string;
}

export interface MockEditStatusRequest {
  id: number;
  status: RequestStatus;
}

export interface MockItemRequestJSON {
  id: number;
  requestorName: string;
  itemRequested: string;
  requestCreatedDate: string;
  lastEditedDate: string | null;
  status: RequestStatus;
}