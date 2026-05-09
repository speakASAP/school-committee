"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  deadline: string | null;
  isClaimed: boolean;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  claimed: "In progress",
  completed: "Completed — awaiting verification",
  verified: "Verified",
};

function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const schoolId = searchParams.get("schoolId") ?? "";

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error.message);
        else setTask(d.task);
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [id]);

  async function claim() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tasks/${id}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });
      const body = await res.json();
      if (!res.ok) { setActionError(body.error?.message ?? "Failed to claim"); return; }
      setTask((t) => t ? { ...t, status: "claimed", isClaimed: true } : t);
    } catch {
      setActionError("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  async function complete() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tasks/${id}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });
      const body = await res.json();
      if (!res.ok) { setActionError(body.error?.message ?? "Failed to mark complete"); return; }
      setTask((t) => t ? { ...t, status: "completed" } : t);
    } catch {
      setActionError("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!task) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
        ← Back to tasks
      </button>
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
          <p className="text-sm text-gray-400 mt-1">
            Status: <span className="font-medium text-gray-700">{STATUS_LABEL[task.status] ?? task.status}</span>
            {" · "}Priority: <span className="font-medium text-gray-700">{task.priority}</span>
          </p>
        </div>
        <p className="text-gray-700 text-sm whitespace-pre-wrap">{task.description}</p>
        {task.deadline && (
          <p className="text-sm text-gray-500">
            Deadline: {new Date(task.deadline).toLocaleDateString("cs-CZ")}
          </p>
        )}
        {actionError && <p className="text-sm text-red-600">{actionError}</p>}
        <div className="flex gap-3 pt-2">
          {task.status === "open" && (
            <button
              onClick={claim}
              disabled={actionLoading}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? "…" : "Claim this task"}
            </button>
          )}
          {task.status === "claimed" && (
            <button
              onClick={complete}
              disabled={actionLoading}
              className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? "…" : "Mark as completed"}
            </button>
          )}
          {(task.status === "completed" || task.status === "verified") && (
            <p className="text-sm text-gray-500 italic">
              {task.status === "verified" ? "This task has been verified. Thank you!" : "Awaiting committee verification."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <Suspense>
      <TaskDetail />
    </Suspense>
  );
}
