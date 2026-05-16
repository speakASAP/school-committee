"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  deadline: string | null;
  isClaimed: boolean;
  assigneeName: string | null;
}

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  normal: "bg-gray-100 text-gray-600",
  low: "bg-green-100 text-green-700",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "vysoká",
  normal: "normální",
  low: "nízká",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  open: "bg-blue-100 text-blue-700",
  reserved: "bg-yellow-100 text-yellow-700",
  claimed: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  verified: "bg-purple-100 text-purple-700",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "koncept",
  open: "otevřený",
  reserved: "přijatý",
  claimed: "přijatý",
  completed: "dokončený",
  verified: "ověřený",
};

const STAFF_ROLES = new Set(["committee", "teacher", "school_staff", "admin"]);

function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([tasksData, meData]: [
      { error?: { message: string }; items?: Task[] },
      { user?: { roles?: string[] } }
    ]) => {
      if (tasksData.error) setError(tasksData.error.message);
      else setTasks(tasksData.items ?? []);
      const roles: string[] = meData.user?.roles ?? [];
      setAuthed(!!meData.user);
      setIsStaff(roles.some((r) => STAFF_ROLES.has(r)));
    }).catch(() => setError("Chyba sítě"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="font-sans text-gray-900">
      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-14 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">🕐</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Dobrovolnické úkoly
          </h1>
          <p className="text-gray-600 text-lg mb-6 max-w-xl mx-auto">
            Přehled všech úkolů školy — otevřených, probíhajících i dokončených.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <span className="bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600">🔵 otevřený — volný k přijetí</span>
            <span className="bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600">🟡 probíhá — někdo pracuje</span>
            <span className="bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600">🟢 dokončený</span>
          </div>
        </div>
      </section>

      {/* TASK LIST */}
      <section className="px-4 py-10 bg-white flex-1">
        <div className="max-w-3xl mx-auto">
          {isStaff && (
            <div className="mb-6">
              <Link
                href="/dashboard/tasks/new"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              >
                + Nový úkol
              </Link>
            </div>
          )}
          {loading && <p className="text-sm text-gray-400 text-center py-10">Načítám…</p>}
          {error && <p className="text-sm text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && tasks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">Žádné úkoly.</p>
          )}
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{task.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
                      {task.assigneeName && (
                        <p className="text-xs text-blue-600 mt-1">👤 {task.assigneeName}</p>
                      )}
                      {task.isClaimed && !task.assigneeName && !authed && (
                        <p className="text-xs text-gray-400 mt-1">
                          👤 <a href="/login" className="underline hover:text-blue-600">Přihlaste se pro zobrazení</a>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[task.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[task.status] ?? task.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_BADGE[task.priority] ?? "bg-gray-100 text-gray-600"}`}>
                        {PRIORITY_LABEL[task.priority] ?? task.priority}
                      </span>
                    </div>
                  </div>
                  {task.deadline && (
                    <p className="text-xs text-gray-400 mt-2">
                      Termín: {new Date(task.deadline).toLocaleDateString("cs-CZ")}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      {!authed && (
        <section className="px-4 py-12 bg-gray-50 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-xl font-bold mb-3">Chcete se zapojit?</h2>
            <p className="text-gray-500 text-sm mb-6">
              Zaregistrujte se a vyberte si úkol, který vám vyhovuje. Nebo přispějte finančně.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="/register" className="bg-blue-600 text-white font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-blue-700 transition-colors">
                Zaregistrovat se →
              </a>
              <a href="/login" className="bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                Přihlásit se
              </a>
              <a href="/payments" className="bg-white border border-blue-200 text-blue-700 font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-blue-50 transition-colors">
                💳 Finanční příspěvek
              </a>
            </div>
          </div>
        </section>
      )}

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
