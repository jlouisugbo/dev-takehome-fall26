"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Dropdown, { DropdownOption } from "@/components/atoms/Dropdown";
import Pagination from "@/components/molecules/Pagination";
import ItemRequestsTable, {
  STATUS_OPTIONS,
} from "@/components/tables/ItemRequestsTable";
import {
  batchDeleteRequests,
  batchPatchStatus,
  fetchItemRequests,
  patchItemStatus,
  requestsQueryKey,
  type StatusFilter,
} from "@/lib/api/requests";
import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import { ItemRequestJSON, RequestStatus } from "@/lib/types/request";

const TAB_OPTIONS: DropdownOption<StatusFilter>[] = [
  { value: "all", label: "All" },
  { value: RequestStatus.PENDING, label: "Pending" },
  { value: RequestStatus.APPROVED, label: "Approved" },
  { value: RequestStatus.COMPLETED, label: "Completed" },
  { value: RequestStatus.REJECTED, label: "Rejected" },
];

function estimateTotalRecords(
  pageNumber: number,
  pageSize: number,
  rowCount: number
): number {
  if (rowCount < pageSize) return (pageNumber - 1) * pageSize + rowCount;
  return pageNumber * pageSize + 1;
}

type MutationContext = { previousRows: ItemRequestJSON[] };

export default function ItemRequestsPage() {
  const queryClient = useQueryClient();
  const [pageNumber, setPageNumber] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState<RequestStatus>(
    RequestStatus.APPROVED
  );

  const queryKey = requestsQueryKey(pageNumber, statusFilter);

  const {
    data: requests = [],
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchItemRequests(pageNumber, statusFilter),
  });

  useEffect(() => {
    setSelectedIds(new Set());
  }, [pageNumber, statusFilter]);

  const statusMutation = useMutation<
    ItemRequestJSON,
    Error,
    { id: string; status: RequestStatus },
    MutationContext
  >({
    mutationFn: ({ id, status }) => patchItemStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRows =
        queryClient.getQueryData<ItemRequestJSON[]>(queryKey) ?? [];
      queryClient.setQueryData<ItemRequestJSON[]>(queryKey, (currentRows) =>
        (currentRows ?? []).map((row) =>
          row.id === id
            ? { ...row, status, lastEditedDate: new Date().toISOString() }
            : row
        )
      );
      return { previousRows };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKey, context.previousRows);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const batchEditMutation = useMutation({
    mutationFn: () =>
      batchPatchStatus(
        [...selectedIds].map((id) => ({ id, status: batchStatus }))
      ),
    onSettled: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: () => batchDeleteRequests([...selectedIds]),
    onSettled: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey });
    },
  });

  function toggleRequestId(requestId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelectedIds((current) =>
      current.size === requests.length
        ? new Set()
        : new Set(requests.map((row) => row.id))
    );
  }

  const totalRecords = estimateTotalRecords(
    pageNumber,
    PAGINATION_PAGE_SIZE,
    requests.length
  );

  const banner = batchEditMutation.isError
    ? "Couldn’t apply batch status."
    : batchDeleteMutation.isError
      ? "Couldn’t delete the selected requests."
      : statusMutation.isError
        ? "Couldn’t update status. Changes were reverted."
        : isError
          ? error.message
          : null;

  const isBatchPending =
    batchEditMutation.isPending || batchDeleteMutation.isPending;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#eff6ff_0%,_#f8fafc_45%,_#ffffff_100%)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Crisis Corner
            </p>
            <h1 className="text-[28px] font-semibold leading-tight text-gray-text-dark sm:text-[36px]">
              Item Requests
            </h1>
            <p className="mt-1 text-sm text-gray-text">
              Review, approve, and track disaster-relief item requests.
            </p>
          </div>

          <div className="hidden sm:inline-flex gap-1 rounded-lg border border-gray-stroke bg-white p-1">
            {TAB_OPTIONS.map((tab) => {
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPageNumber(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-text hover:bg-gray-fill"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="sm:hidden">
            <Dropdown
              value={statusFilter}
              options={TAB_OPTIONS}
              onChange={(nextFilter) => {
                setStatusFilter(nextFilter);
                setPageNumber(1);
              }}
              aria-label="Filter by status"
            />
          </div>
        </header>

        {banner ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger-indicator/30 bg-danger-fill px-4 py-3 text-sm text-danger-text"
          >
            {banner}
          </div>
        ) : null}

        <div
          className={`relative transition-opacity duration-200 ${
            isFetching ? "opacity-60" : "opacity-100"
          }`}
        >
          {selectedIds.size > 0 ? (
            <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center gap-2 rounded-t-xl border-b border-gray-stroke bg-gray-fill-light px-4">
              <span className="mr-auto text-xs font-medium uppercase tracking-wide text-gray-text">
                {selectedIds.size} selected
              </span>
              <Dropdown
                value={batchStatus}
                options={STATUS_OPTIONS}
                onChange={setBatchStatus}
                aria-label="Status to apply to selected requests"
              />
              <button
                type="button"
                disabled={isBatchPending}
                onClick={() => batchEditMutation.mutate()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Apply
              </button>
              <button
                type="button"
                disabled={isBatchPending}
                onClick={() => batchDeleteMutation.mutate()}
                className="rounded-md px-3 py-1.5 text-sm text-danger-text hover:bg-danger-fill disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ) : null}

          {requests.length === 0 && !isFetching && !isError ? (
            <p className="rounded-xl border border-dashed border-gray-stroke bg-white px-4 py-12 text-center text-gray-text">
              No requests in this view.
            </p>
          ) : (
            <ItemRequestsTable
              requests={requests}
              selectedIds={selectedIds}
              updatingId={
                statusMutation.isPending
                  ? (statusMutation.variables?.id ?? null)
                  : null
              }
              onToggleId={toggleRequestId}
              onToggleAll={toggleAllOnPage}
              onStatusChange={(requestId, status) =>
                statusMutation.mutate({ id: requestId, status })
              }
            />
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Pagination
            pageNumber={pageNumber}
            pageSize={PAGINATION_PAGE_SIZE}
            totalRecords={totalRecords}
            onPageChange={setPageNumber}
          />
        </div>
      </div>
    </main>
  );
}