"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  deadline: string | null;
  isClaimed: boolean;
  createdAt: string;
  assigneeName: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Otevřený",
  reserved: "Probíhá",
  claimed: "Probíhá",
  completed: "Dokončený — čeká na ověření",
  verified: "Ověřený",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "vysoká",
  normal: "normální",
  low: "nízká",
};

function TaskDetail() {
  const { id } = useParams<{ id: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tasks/${id}`).then((r) => r.json()),
      fetch("/api/auth/session").then((r) => r.json()).catch(() => ({})),
    ]).then(([taskData, sessionData]) => {
      if (taskData.error) setError(taskData.error.message);
      else setTask(taskData.task);
      setAuthed(!!sessionData.user);
    }).catch(() => setError("Chyba sítě"))
      .finally(() => setLoading(false));
  }, [id]);

  async function claim() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tasks/${id}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (res.status === 401) {
        window.location.href = `/login?next=/tasks/${id}`;
        return;
      }
      if (!res.ok) { setActionError(body.error?.message ?? "Přijetí selhalo"); return; }
      setTask((t) => t ? { ...t, status: "reserved", isClaimed: true } : t);
    } catch {
      setActionError("Chyba sítě");
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
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (res.status === 401) {
        window.location.href = `/login?next=/tasks/${id}`;
        return;
      }
      if (!res.ok) { setActionError(body.error?.message ?? "Označení selhalo"); return; }
      setTask((t) => t ? { ...t, status: "completed" } : t);
    } catch {
      setActionError("Chyba sítě");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900">
      <SiteHeader />

      <div className="flex-1 px-4 py-10 bg-white">
        <div className="max-w-2xl mx-auto">
          {loading && <p className="text-sm text-gray-400">Načítám…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {task && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div>
                <h1 className="text-xl font-extrabold text-gray-900">{task.title}</h1>
                <p className="text-sm text-gray-400 mt-1">
                  Stav: <span className="font-medium text-gray-700">{STATUS_LABEL[task.status] ?? task.status}</span>
                  {" · "}
                  Priorita: <span className="font-medium text-gray-700">{PRIORITY_LABEL[task.priority] ?? task.priority}</span>
                </p>
              </div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{task.description}</p>
              {task.deadline && (
                <p className="text-sm text-gray-500">
                  Termín: {new Date(task.deadline).toLocaleDateString("cs-CZ")}
                </p>
              )}
              {task.assigneeName ? (
                <p className="text-sm text-gray-500">
                  Řeší: <span className="font-medium text-gray-800">{task.assigneeName}</span>
                </p>
              ) : task.isClaimed ? (
                <p className="text-sm text-gray-400">
                  👤 <a href="/login" className="underline hover:text-blue-600">Přihlaste se pro zobrazení řešitele</a>
                </p>
              ) : null}
              {task.startedAt && (
                <p className="text-sm text-gray-500">
                  Zahájeno: {new Date(task.startedAt).toLocaleDateString("cs-CZ")}
                </p>
              )}
              {task.finishedAt && (
                <p className="text-sm text-gray-500">
                  Dokončeno: {new Date(task.finishedAt).toLocaleDateString("cs-CZ")}
                </p>
              )}
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              <div className="flex gap-3 pt-2 flex-wrap">
                {authed ? (
                  <>
                    {task.status === "open" && (
                      <button
                        onClick={claim}
                        disabled={actionLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
                      >
                        {actionLoading ? "…" : "Přijmout úkol"}
                      </button>
                    )}
                    {(task.status === "reserved" || task.status === "claimed") && (
                      <button
                        onClick={complete}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
                      >
                        {actionLoading ? "…" : "Označit jako dokončený"}
                      </button>
                    )}
                    {(task.status === "completed" || task.status === "verified") && (
                      <p className="text-sm text-gray-500 italic">
                        {task.status === "verified"
                          ? "Tento úkol byl ověřen. Děkujeme!"
                          : "Čeká na ověření výborem."}
                      </p>
                    )}
                  </>
                ) : (
                  task.status === "open" && (
                    <a
                      href={`/login?next=/tasks/${id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                    >
                      Přihlaste se a přijměte úkol →
                    </a>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 px-4 py-8 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { label: "QR příspěvky", href: "/payments" },
              { label: "Dobrovolnictví", href: "/tasks" },
              { label: "Transparentnost", href: "/report" },
              { label: "GDPR", href: "/gdpr" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors">{l.label}</a>
            ))}
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Školní výbor · school-committee.alfares.cz</p>
        </div>
      </footer>
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
