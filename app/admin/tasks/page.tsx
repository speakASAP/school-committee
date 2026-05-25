"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TASK_STATUSES, STATUS_LABEL as SHARED_STATUS_LABEL, STATUS_COLOR } from "@/lib/statuses";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  createdAt: string;
  assigneeName: string | null;
  assignedTo: string | null;
}

interface UserOption {
  userId: string;
  firstName: string;
  lastName: string;
  titleBefore: string | null;
  titleAfter: string | null;
}

interface Assignee {
  userId: string;
  status: string;
  acceptedAt: string;
  completedAt: string | null;
  firstName: string;
  lastName: string;
  titleBefore: string | null;
  titleAfter: string | null;
}

const STATUS_LABEL = SHARED_STATUS_LABEL;

const PRIORITY_LABEL: Record<string, string> = {
  high: "vysoká",
  normal: "normální",
  low: "nízká",
};

const ALL_STATUSES = [...TASK_STATUSES];

function canApprove(status: string) {
  return status === "draft" || status === "completed";
}

function approveLabel(status: string) {
  if (status === "draft") return "Publikovat";
  if (status === "completed") return "Ověřit";
  return "";
}

function formatUserName(u: { titleBefore: string | null; firstName: string; lastName: string; titleAfter: string | null }) {
  return [u.titleBefore, u.firstName, u.lastName, u.titleAfter].filter(Boolean).join(" ");
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [editDeadline, setEditDeadline] = useState("");
  const [editStatus, setEditStatus] = useState("open");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Assignees panel
  const [assigneesTaskId, setAssigneesTaskId] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [addingUserId, setAddingUserId] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);
  const [completingUserId, setCompletingUserId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks?limit=200").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([tasksData, meData]) => {
      if (tasksData.error) setError(tasksData.error.message);
      else setTasks(tasksData.items ?? []);

      const tenantId = meData.user?.tenantId ?? "";
      if (tenantId) {
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
    }).catch(() => setError("Chyba sítě")).finally(() => setLoading(false));
  }, []);

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription("");
    setEditPriority(task.priority);
    setEditDeadline(task.deadline ? task.deadline.split("T")[0] : "");
    setEditStatus(task.status);
    setSaveError(null);
    setAssigneesTaskId(null);
    fetch(`/api/tasks/${task.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.task?.description) setEditDescription(d.task.description);
      })
      .catch(() => {});
  }

  async function saveEdit(taskId: string) {
    setSaveLoading(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          deadline: editDeadline || null,
          status: editStatus,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setSaveError(body.error?.message ?? "Uložení selhalo");
        return;
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, title: editTitle, priority: editPriority, deadline: editDeadline || null, status: editStatus }
            : t,
        ),
      );
      setEditingId(null);
    } catch {
      setSaveError("Chyba sítě");
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleDelete(taskId: string, title: string) {
    if (!confirm(`Opravdu smazat úkol "${title}"? Tato akce je nevratná.`)) return;
    setDeletingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        alert(`Chyba: ${body.error?.message ?? res.status}`);
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      alert("Chyba sítě");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleApprove(task: Task) {
    const label = approveLabel(task.status);
    if (!confirm(`${label} úkol "${task.title}"?`)) return;
    setApprovingId(task.id);
    try {
      const url = task.status === "draft" ? `/api/tasks/${task.id}/publish` : `/api/tasks/${task.id}/verify`;
      let body: Record<string, string> = {};
      if (task.status === "draft") {
        const detail = await fetch(`/api/tasks/${task.id}`).then((r) => r.json());
        body = { title: detail.task?.title ?? task.title, description: detail.task?.description ?? "" };
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json();
        alert(`Chyba: ${b.error?.message ?? res.status}`);
        return;
      }
      const newStatus = task.status === "draft" ? "open" : "verified";
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    } catch {
      alert("Chyba sítě");
    } finally {
      setApprovingId(null);
    }
  }

  async function openAssignees(taskId: string) {
    if (assigneesTaskId === taskId) {
      setAssigneesTaskId(null);
      return;
    }
    setAssigneesTaskId(taskId);
    setEditingId(null);
    setAssigneesLoading(true);
    setAddingUserId("");
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees`);
      const data = await res.json();
      setAssignees(data.items ?? []);
    } catch {
      setAssignees([]);
    } finally {
      setAssigneesLoading(false);
    }
  }

  async function addAssignee(taskId: string) {
    if (!addingUserId) return;
    setAddingLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees/${addingUserId}`, { method: "PUT" });
      if (!res.ok) {
        const b = await res.json();
        alert(b.error?.message ?? "Chyba");
        return;
      }
      // Refresh assignees list
      const updated = await fetch(`/api/tasks/${taskId}/assignees`).then((r) => r.json());
      setAssignees(updated.items ?? []);
      setAddingUserId("");
      // Update task status in list
      const taskRes = await fetch(`/api/tasks/${taskId}`).then((r) => r.json());
      if (taskRes.task) {
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: taskRes.task.status } : t));
      }
    } catch {
      alert("Chyba sítě");
    } finally {
      setAddingLoading(false);
    }
  }

  async function markComplete(taskId: string, userId: string) {
    setCompletingUserId(userId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees/${userId}/complete`, { method: "POST" });
      if (!res.ok) {
        const b = await res.json();
        alert(b.error?.message ?? "Chyba");
        return;
      }
      setAssignees((prev) =>
        prev.map((a) =>
          a.userId === userId ? { ...a, status: "completed", completedAt: new Date().toISOString() } : a,
        ),
      );
    } catch {
      alert("Chyba sítě");
    } finally {
      setCompletingUserId(null);
    }
  }

  async function removeAssignee(taskId: string, userId: string) {
    if (!confirm("Odebrat tohoto řešitele?")) return;
    try {
      await fetch(`/api/tasks/${taskId}/assignees/${userId}`, { method: "DELETE" });
      setAssignees((prev) => prev.filter((a) => a.userId !== userId));
    } catch {
      alert("Chyba sítě");
    }
  }

  const assignedUserIds = new Set(assignees.map((a) => a.userId));

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Správa úkolů</h1>
        <Link
          href="/dashboard/tasks/new"
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-700 transition-colors"
        >
          + Nový úkol
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-400">Načítám…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && tasks.length === 0 && (
        <p className="text-sm text-gray-500">Žádné úkoly.</p>
      )}

      {tasks.length > 0 && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-3 font-medium">Název</th>
              <th className="pb-2 pr-3 font-medium">Stav</th>
              <th className="pb-2 pr-3 font-medium">Priorita</th>
              <th className="pb-2 pr-3 font-medium">Termín</th>
              <th className="pb-2 font-medium">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <>
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-3 font-medium text-gray-900 max-w-xs truncate">
                    <Link href={`/tasks/${task.id}`} className="hover:text-blue-600 hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-gray-600">{STATUS_LABEL[task.status] ?? task.status}</td>
                  <td className="py-2 pr-3 text-gray-600">{PRIORITY_LABEL[task.priority] ?? task.priority}</td>
                  <td className="py-2 pr-3 text-gray-500">
                    {task.deadline ? new Date(task.deadline).toLocaleDateString("cs-CZ") : "—"}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => (editingId === task.id ? setEditingId(null) : startEdit(task))}
                        className="text-yellow-600 hover:text-yellow-800 text-xs font-medium"
                      >
                        {editingId === task.id ? "Zrušit" : "Upravit"}
                      </button>
                      <button
                        onClick={() => openAssignees(task.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        {assigneesTaskId === task.id ? "Zavřít řešitele" : "Řešitelé"}
                      </button>
                      <button
                        onClick={() => handleDelete(task.id, task.title)}
                        disabled={deletingId === task.id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                      >
                        {deletingId === task.id ? "Mažu…" : "Smazat"}
                      </button>
                      {canApprove(task.status) && (
                        <button
                          onClick={() => handleApprove(task)}
                          disabled={approvingId === task.id}
                          className="text-green-700 hover:text-green-900 text-xs font-medium disabled:opacity-50"
                        >
                          {approvingId === task.id ? "…" : approveLabel(task.status)}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Edit panel */}
                {editingId === task.id && (
                  <tr key={`${task.id}-edit`}>
                    <td colSpan={5} className="py-3 px-2 bg-yellow-50 border-b border-yellow-100">
                      <div className="space-y-2 max-w-2xl">
                        {saveError && <p className="text-xs text-red-600">{saveError}</p>}
                        <div className="flex gap-2 flex-wrap">
                          <div className="flex-1 min-w-48">
                            <label className="block text-xs text-gray-500 mb-0.5">Název</label>
                            <input
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Priorita</label>
                            <select
                              className="border border-gray-200 rounded px-2 py-1 text-sm"
                              value={editPriority}
                              onChange={(e) => setEditPriority(e.target.value)}
                            >
                              <option value="high">vysoká</option>
                              <option value="normal">normální</option>
                              <option value="low">nízká</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Termín</label>
                            <input
                              type="date"
                              className="border border-gray-200 rounded px-2 py-1 text-sm"
                              value={editDeadline}
                              onChange={(e) => setEditDeadline(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Stav</label>
                            <select
                              className="border border-gray-200 rounded px-2 py-1 text-sm"
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                            >
                              {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Popis</label>
                          <textarea
                            rows={3}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </div>
                        <button
                          onClick={() => saveEdit(task.id)}
                          disabled={saveLoading || !editTitle.trim() || !editDescription.trim()}
                          className="bg-blue-600 text-white rounded px-3 py-1 text-xs font-medium disabled:opacity-50"
                        >
                          {saveLoading ? "Ukládám…" : "Uložit"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Assignees panel */}
                {assigneesTaskId === task.id && (
                  <tr key={`${task.id}-assignees`}>
                    <td colSpan={5} className="py-3 px-2 bg-blue-50 border-b border-blue-100">
                      <div className="max-w-2xl space-y-3">
                        <p className="text-xs font-semibold text-blue-800">Řešitelé úkolu</p>

                        {assigneesLoading && <p className="text-xs text-gray-400">Načítám…</p>}

                        {!assigneesLoading && assignees.length === 0 && (
                          <p className="text-xs text-gray-500">Žádní řešitelé.</p>
                        )}

                        {!assigneesLoading && assignees.length > 0 && (
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="text-left text-gray-500 border-b border-blue-200">
                                <th className="pb-1 pr-3 font-medium">Jméno</th>
                                <th className="pb-1 pr-3 font-medium">Přijato</th>
                                <th className="pb-1 pr-3 font-medium">Stav</th>
                                <th className="pb-1 font-medium">Akce</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-100">
                              {assignees.map((a) => (
                                <tr key={a.userId}>
                                  <td className="py-1.5 pr-3 font-medium text-gray-900">
                                    {formatUserName(a)}
                                  </td>
                                  <td className="py-1.5 pr-3 text-gray-500">
                                    {new Date(a.acceptedAt).toLocaleDateString("cs-CZ")}
                                  </td>
                                  <td className="py-1.5 pr-3">
                                    {a.status === "completed" ? (
                                      <span className="text-green-700 font-medium">
                                        ★★★ Splněno {a.completedAt ? new Date(a.completedAt).toLocaleDateString("cs-CZ") : ""}
                                      </span>
                                    ) : (
                                      <span className="text-blue-600">Přijato</span>
                                    )}
                                  </td>
                                  <td className="py-1.5">
                                    <div className="flex gap-2">
                                      {a.status !== "completed" && (
                                        <button
                                          onClick={() => markComplete(task.id, a.userId)}
                                          disabled={completingUserId === a.userId}
                                          className="text-green-700 hover:text-green-900 font-medium disabled:opacity-50"
                                        >
                                          {completingUserId === a.userId ? "…" : "Označit splněný ★★★"}
                                        </button>
                                      )}
                                      <button
                                        onClick={() => removeAssignee(task.id, a.userId)}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        Odebrat
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {/* Add assignee */}
                        <div className="flex gap-2 items-end pt-1">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-0.5">Přidat řešitele</label>
                            <select
                              className="w-full border border-blue-200 rounded px-2 py-1 text-sm"
                              value={addingUserId}
                              onChange={(e) => setAddingUserId(e.target.value)}
                            >
                              <option value="">— vyberte osobu —</option>
                              {users
                                .filter((u) => !assignedUserIds.has(u.userId))
                                .map((u) => (
                                  <option key={u.userId} value={u.userId}>
                                    {formatUserName(u)}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <button
                            onClick={() => addAssignee(task.id)}
                            disabled={!addingUserId || addingLoading}
                            className="bg-blue-600 text-white rounded px-3 py-1 text-xs font-medium disabled:opacity-50"
                          >
                            {addingLoading ? "…" : "Přidat"}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
