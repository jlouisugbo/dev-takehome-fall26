"use client";

import Dropdown, { DropdownOption } from "@/components/atoms/Dropdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/Table";
import { ItemRequestJSON, RequestStatus } from "@/lib/types/request";

export const STATUS_OPTIONS: DropdownOption<RequestStatus>[] = [
  { value: RequestStatus.PENDING, label: "Pending" },
  { value: RequestStatus.APPROVED, label: "Approved" },
  { value: RequestStatus.COMPLETED, label: "Completed" },
  { value: RequestStatus.REJECTED, label: "Rejected" },
];

interface ItemRequestsTableProps {
  requests: ItemRequestJSON[];
  selectedIds: Set<string>;
  updatingId: string | null;
  onToggleId: (requestId: string) => void;
  onToggleAll: () => void;
  onStatusChange: (requestId: string, status: RequestStatus) => void;
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]:
    "bg-warning-fill text-warning-text border-warning-indicator/40",
  [RequestStatus.APPROVED]:
    "bg-success-fill text-success-text border-success-indicator/40",
  [RequestStatus.COMPLETED]: "bg-primary-fill text-primary border-primary/30",
  [RequestStatus.REJECTED]:
    "bg-danger-fill text-danger-text border-danger-indicator/40",
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const parsed = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusChip({
  request,
  disabled,
  onStatusChange,
}: {
  request: ItemRequestJSON;
  disabled: boolean;
  onStatusChange: (requestId: string, status: RequestStatus) => void;
}) {
  return (
    <div className={`inline-flex rounded-md border ${STATUS_STYLES[request.status]}`}>
      <Dropdown
        value={request.status}
        options={STATUS_OPTIONS}
        disabled={disabled}
        aria-label={`Status for ${request.requestorName}`}
        onChange={(status) => onStatusChange(request.id, status)}
        className="border-0 bg-transparent shadow-none"
      />
    </div>
  );
}

export default function ItemRequestsTable({
  requests,
  selectedIds,
  updatingId,
  onToggleId,
  onToggleAll,
  onStatusChange,
}: ItemRequestsTableProps) {
  const allSelected =
    requests.length > 0 && selectedIds.size === requests.length;

  return (
    <>
      <Table>
        <TableHead>
          <tr>
            <TableHeader>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all requests on this page"
              />
            </TableHeader>
            <TableHeader>Name</TableHeader>
            <TableHeader>Item Requested</TableHeader>
            <TableHeader>Created</TableHeader>
            <TableHeader>Last Edited</TableHeader>
            <TableHeader>Status</TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {requests.map((request, rowIndex) => (
            <TableRow key={request.id} index={rowIndex}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedIds.has(request.id)}
                  onChange={() => onToggleId(request.id)}
                  aria-label={`Select ${request.requestorName}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                {request.requestorName}
              </TableCell>
              <TableCell>{request.itemRequested}</TableCell>
              <TableCell className="text-gray-text">
                {formatDate(request.requestCreatedDate)}
              </TableCell>
              <TableCell className="text-gray-text">
                {formatDate(
                  request.lastEditedDate ?? request.requestCreatedDate
                )}
              </TableCell>
              <TableCell>
                <StatusChip
                  request={request}
                  disabled={updatingId === request.id}
                  onStatusChange={onStatusChange}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="md:hidden flex flex-col gap-3">
        {requests.map((request, rowIndex) => (
          <article
            key={request.id}
            className="animate-row-in rounded-xl border border-gray-stroke bg-white p-4 flex flex-col gap-3"
            style={{ animationDelay: `${rowIndex * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.has(request.id)}
                  onChange={() => onToggleId(request.id)}
                  aria-label={`Select ${request.requestorName}`}
                />
                <span>
                  <span className="block font-medium text-gray-text-dark">
                    {request.requestorName}
                  </span>
                  <span className="mt-0.5 block text-sm text-gray-text">
                    {request.itemRequested}
                  </span>
                </span>
              </label>
              <StatusChip
                request={request}
                disabled={updatingId === request.id}
                onStatusChange={onStatusChange}
              />
            </div>
            <div className="flex gap-4 text-xs text-gray-text">
              <span>Created {formatDate(request.requestCreatedDate)}</span>
              <span>
                Edited{" "}
                {formatDate(
                  request.lastEditedDate ?? request.requestCreatedDate
                )}
              </span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}