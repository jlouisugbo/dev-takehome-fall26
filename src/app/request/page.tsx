"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import { putItemRequest } from "@/lib/api/requests";
import { APP_PATHS } from "@/lib/constants/paths";

export default function RequestPage() {
  const [requestorName, setRequestorName] = useState("");
  const [itemRequested, setItemRequested] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const created = await putItemRequest(requestorName, itemRequested);
      setSuccess(`Submitted ${created.itemRequested} for ${created.requestorName}.`);
      setRequestorName("");
      setItemRequested("");
    } catch {
      setError("Could not submit. Names need 3–30 characters; items 2–100.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-primary text-white px-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 w-full max-w-md bg-white text-gray-text p-6 rounded-md"
      >
        <h1 className="text-primary text-2xl font-bold">Request an item</h1>
        <Input
          label="Your name"
          placeholder="Alex Rivera"
          value={requestorName}
          onChange={(e) => setRequestorName(e.target.value)}
        />
        <Input
          label="Item requested"
          placeholder="Flashlights"
          value={itemRequested}
          onChange={(e) => setItemRequested(e.target.value)}
        />
        {error && <p className="text-red-600">{error}</p>}
        {success && <p className="text-green-700">{success}</p>}
        <Button type="submit" variant="primary">
          {submitting ? "Submitting…" : "Submit request"}
        </Button>
        <Link href={APP_PATHS.ADMIN_PORTAL} className="text-primary underline text-center">
          View in admin
        </Link>
      </form>
    </div>
  );
}