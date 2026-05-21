"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { UserAvatar } from "@/components/UserAvatar";

interface TaskPhoto {
  id: string;
  fileId: string;
  url: string;
}

interface TaskVideo {
  id: string;
  fileId: string;
  url: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  deadline: string | null;
  isClaimed: boolean;
  assignedTo: string | null;
  createdAt: string;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  photos: TaskPhoto[];
  videos: TaskVideo[];
}

interface UserOption {
  userId: string;
  firstName: string;
  lastName: string;
  titleBefore: string | null;
  titleAfter: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Koncept",
  open: "Otevřený",
  reserved: "Zaplánováno",
  claimed: "Probíhá",
  completed: "Dokončený — čeká na ověření",
  verified: "Ověřený",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "vysoká",
  normal: "normální",
  low: "nízká",
};

const ALL_STATUSES = ["draft", "open", "reserved", "claimed", "completed", "verified"];

const STAFF_ROLES = new Set(["committee", "teacher", "school_staff", "admin"]);
const COMMITTEE_ROLES = new Set(["committee", "admin"]);

function formatUserName(u: UserOption) {
  return [u.titleBefore, u.firstName, u.lastName, u.titleAfter].filter(Boolean).join(" ");
}

function TaskDetail() {
  const { id } = useParams<{ id: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [authed, setAuthed] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isCommittee, setIsCommittee] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [editDeadline, setEditDeadline] = useState("");
  const [editStatus, setEditStatus] = useState("open");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tasks/${id}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([taskData, sessionData]: [
      { error?: { message: string }; task?: Task },
      { user?: { roles?: string[]; tenantId?: string } }
    ]) => {
      if (taskData.error) setError(taskData.error.message);
      else {
        const t = taskData.task;
        if (t) { t.photos = t.photos ?? []; t.videos = t.videos ?? []; }
        setTask(t ?? null);
        if (t) {
          setEditTitle(t.title);
          setEditDescription(t.description);
          setEditPriority(t.priority);
          setEditDeadline(t.deadline ? t.deadline.split("T")[0] : "");
          setEditStatus(t.status);
          setEditAssignedTo(t.assignedTo ?? "");
        }
      }
      setAuthed(!!sessionData.user);
      const roles: string[] = sessionData.user?.roles ?? [];
      const staff = roles.some((r: string) => STAFF_ROLES.has(r));
      setIsStaff(staff);
      setIsCommittee(roles.some((r: string) => COMMITTEE_ROLES.has(r)));

      // Load users list for staff assignee dropdown
      const tenantId = sessionData.user?.tenantId ?? "";
      if (staff && tenantId) {
        fetch(`/api/admin/users?tenantId=${tenantId}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.users) {
              setUsers(
                (d.users as UserOption[]).sort((a, b) =>
                  `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, "cs"),
                ),
              );
            }
          })
          .catch(() => {});
      }
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
      if (res.status === 401) { window.location.href = `/login?next=/tasks/${id}`; return; }
      if (!res.ok) { setActionError(body.error?.message ?? "Přijetí selhalo"); return; }
      setTask((t) => t ? { ...t, status: "reserved", isClaimed: true } : t);
    } catch {
      setActionError("Chyba sítě");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteTask() {
    if (!confirm("Opravdu smazat tento úkol? Tato akce je nevratná.")) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.status === 401) { window.location.href = `/login?next=/tasks/${id}`; return; }
      if (!res.ok) {
        const body = await res.json();
        setActionError(body.error?.message ?? "Smazání selhalo");
        return;
      }
      window.location.href = "/tasks";
    } catch {
      setActionError("Chyba sítě");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveEdit() {
    setSaveLoading(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          deadline: editDeadline || null,
          status: editStatus,
          assignedTo: editAssignedTo || null,
        }),
      });
      if (res.status === 401) { window.location.href = `/login?next=/tasks/${id}`; return; }
      if (!res.ok) {
        const body = await res.json();
        setSaveError(body.error?.message ?? "Uložení selhalo");
        return;
      }
      const assigneeUser = editAssignedTo ? users.find((u) => u.userId === editAssignedTo) : null;
      const assigneeName = assigneeUser ? assigneeUser.firstName : null;
      setTask((t) => t
        ? {
            ...t,
            title: editTitle,
            description: editDescription,
            priority: editPriority,
            deadline: editDeadline || null,
            status: editStatus,
            assignedTo: editAssignedTo || null,
            isClaimed: !!editAssignedTo,
            assigneeName,
          }
        : t,
      );
      setEditing(false);
    } catch {
      setSaveError("Chyba sítě");
    } finally {
      setSaveLoading(false);
    }
  }

  async function approveTask() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tasks/${id}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (res.status === 401) { window.location.href = `/login?next=/tasks/${id}`; return; }
      if (!res.ok) { setActionError(body.error?.message ?? "Schválení selhalo"); return; }
      setTask((t) => t ? { ...t, status: "open" } : t);
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
      if (res.status === 401) { window.location.href = `/login?next=/tasks/${id}`; return; }
      if (!res.ok) { setActionError(body.error?.message ?? "Označení selhalo"); return; }
      setTask((t) => t ? { ...t, status: "completed" } : t);
    } catch {
      setActionError("Chyba sítě");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="font-sans text-gray-900">
      <div className="px-4 py-10 bg-white">
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
              <div className="prose prose-sm prose-gray max-w-none text-gray-700">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mt-4 mb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mt-4 mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold text-gray-900 mt-3 mb-1">{children}</h3>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  }}
                >
                  {task.description}
                </ReactMarkdown>
              </div>

              {task.photos?.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {task.photos.map((photo) => (
                    <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={photo.url}
                        alt=""
                        className="rounded-xl object-cover w-full aspect-square border border-gray-100 hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              )}

              {task.videos?.length > 0 && (
                <div className="flex flex-col gap-3">
                  {task.videos.map((video) => (
                    <video
                      key={video.id}
                      src={video.url}
                      controls
                      className="rounded-xl w-full border border-gray-100"
                    />
                  ))}
                </div>
              )}

              {task.deadline && (
                <p className="text-sm text-gray-500">
                  Termín: {new Date(task.deadline).toLocaleDateString("cs-CZ")}
                </p>
              )}
              {task.assigneeName ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Řeší:</span>
                  <UserAvatar avatarUrl={task.assigneeAvatarUrl} firstName={task.assigneeName.split(" ")[0] ?? ""} lastName={task.assigneeName.split(" ")[1] ?? ""} size="xs" />
                  <span className="font-medium text-gray-800">{task.assigneeName}</span>
                </div>
              ) : task.isClaimed && !authed ? (
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
                {isStaff && (
                  <>
                    {task.status === "draft" && (
                      <button
                        onClick={approveTask}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
                      >
                        {actionLoading ? "…" : "Schválit a zveřejnit"}
                      </button>
                    )}
                    <button
                      onClick={() => setEditing((e) => !e)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                    >
                      {editing ? "Zrušit" : "Upravit"}
                    </button>
                    <button
                      onClick={deleteTask}
                      disabled={actionLoading}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? "…" : "Smazat úkol"}
                    </button>
                  </>
                )}
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
                    {isCommittee && (task.status === "reserved" || task.status === "claimed") && (
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
                  task.status === "open" && !task.isClaimed && (
                    <a
                      href={`/login?next=/tasks/${id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                    >
                      Přihlaste se a přijměte úkol →
                    </a>
                  )
                )}
              </div>

              {editing && (
                <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                  {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Název</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Popis</label>
                    <textarea
                      rows={4}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Priorita</label>
                      <select
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                      >
                        <option value="high">vysoká</option>
                        <option value="normal">normální</option>
                        <option value="low">nízká</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Termín</label>
                      <input
                        type="date"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Stav</label>
                      <select
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {users.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Zodpovědná osoba</label>
                      <select
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        value={editAssignedTo}
                        onChange={(e) => setEditAssignedTo(e.target.value)}
                      >
                        <option value="">— nikdo —</option>
                        {users.map((u) => (
                          <option key={u.userId} value={u.userId}>
                            {formatUserName(u)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    onClick={saveEdit}
                    disabled={saveLoading || !editTitle.trim() || !editDescription.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    {saveLoading ? "Ukládám…" : "Uložit změny"}
                  </button>
                </div>
              )}
            </div>
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
