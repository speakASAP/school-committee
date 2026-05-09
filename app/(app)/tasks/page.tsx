"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  deadline: string | null;
  isClaimed: boolean;
}

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  normal: "bg-gray-100 text-gray-600",
  low: "bg-green-100 text-green-700",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  claimed: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  verified: "bg-purple-100 text-purple-700",
};

function TaskList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const schoolId = searchParams.get("schoolId") ?? "";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputSchoolId, setInputSchoolId] = useState(schoolId);

  function load(sid: string) {
    if (!sid) return;
    setLoading(true);
    setError(null);
    fetch(`/api/tasks?schoolId=${encodeURIComponent(sid)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error.message);
        else setTasks(d.items ?? []);
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (schoolId) load(schoolId);
  }, [schoolId]);

  function search() {
    router.replace(`/tasks?schoolId=${encodeURIComponent(inputSchoolId)}`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Volunteer Tasks</h1>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          placeholder="School ID (uuid)"
          value={inputSchoolId}
          onChange={(e) => setInputSchoolId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button
          onClick={search}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm"
        >
          Load
        </button>
      </div>
      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && tasks.length === 0 && schoolId && (
        <p className="text-sm text-gray-400">No tasks found.</p>
      )}
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={`/tasks/${task.id}?schoolId=${encodeURIComponent(schoolId)}`}
              className="block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[task.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {task.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_BADGE[task.priority] ?? "bg-gray-100 text-gray-600"}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
              {task.deadline && (
                <p className="text-xs text-gray-400 mt-2">
                  Due: {new Date(task.deadline).toLocaleDateString("cs-CZ")}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense>
      <TaskList />
    </Suspense>
  );
}
