# Task Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a publicly-readable, auth-gated write comments section to the task detail page, and update the radiator painting task with its date and description.

**Architecture:** New DB layer (`lib/db/task-comments.ts`) mirrors the idea-comments pattern. A new API route `app/api/tasks/[id]/comments/route.ts` handles GET (unauthenticated allowed) and POST (auth required). A new `components/tasks/TaskCommentThread.tsx` client component is embedded in the existing task detail page. The TaskComment Prisma model already exists — no migration needed.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Prisma (TaskComment model), vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `lib/db/task-comments.ts` | DB reads/writes for task comments |
| Create | `app/api/tasks/[id]/comments/route.ts` | GET (public) + POST (auth) HTTP endpoints |
| Create | `components/tasks/TaskCommentThread.tsx` | Client component: comment list + post form |
| Create | `tests/tasks/comments-route.test.ts` | Vitest unit tests for the API route |
| Modify | `app/(public)/tasks/[id]/page.tsx` | Add `<TaskCommentThread>` after task card |

---

## Task 1: DB layer — `lib/db/task-comments.ts`

**Files:**
- Create: `lib/db/task-comments.ts`

- [ ] **Step 1: Write the file**

```typescript
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { getAvatarUrl } from "@/lib/storage/media-urls";
import { AppError } from "@/types/errors";

export interface TaskCommentWithAuthor {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: Date;
  authorFirstName: string;
  authorAvatarUrl: string | null;
}

export async function listTaskComments(taskId: string): Promise<TaskCommentWithAuthor[]> {
  const rows = await db.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    include: {
      task: { select: { id: true } },
    },
  });

  return Promise.all(
    rows.map(async (c) => {
      const profile = await db.profile.findUnique({
        where: { userId: c.userId },
        select: { firstName: true, avatarFileKey: true },
      });
      return {
        id: c.id,
        taskId: c.taskId,
        userId: c.userId,
        body: c.body,
        createdAt: c.createdAt,
        authorFirstName: profile?.firstName ?? "Rodič",
        authorAvatarUrl: await getAvatarUrl(profile?.avatarFileKey ?? null, "task-comments"),
      };
    }),
  );
}

export async function createTaskComment(
  taskId: string,
  userId: string,
  body: string,
  tenantId: string,
  schoolId: string,
  requestId?: string,
): Promise<TaskCommentWithAuthor> {
  const task = await db.task.findUnique({ where: { id: taskId }, select: { id: true, status: true } });
  if (!task) throw new AppError("NOT_FOUND", "Úkol nenalezen", 404);

  const comment = await db.$transaction(async (tx) => {
    const c = await tx.taskComment.create({ data: { taskId, userId, body } });
    await writeAuditEvent(
      {
        tenantId,
        schoolId,
        actorUserId: userId,
        action: "task_comment.created",
        entityType: "task_comment",
        entityId: c.id,
        requestId,
      },
      tx,
    );
    return c;
  });

  const profile = await db.profile.findUnique({
    where: { userId },
    select: { firstName: true, avatarFileKey: true },
  });

  return {
    id: comment.id,
    taskId: comment.taskId,
    userId: comment.userId,
    body: comment.body,
    createdAt: comment.createdAt,
    authorFirstName: profile?.firstName ?? "Rodič",
    authorAvatarUrl: await getAvatarUrl(profile?.avatarFileKey ?? null, "task-comments"),
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "task-comments"
```

Expected: no output (no errors in this file).

---

## Task 2: API route — `app/api/tasks/[id]/comments/route.ts`

**Files:**
- Create: `app/api/tasks/[id]/comments/route.ts`

- [ ] **Step 1: Write the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { tryGetCurrentUser, getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { listTaskComments, createTaskComment } from "@/lib/db/task-comments";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireApproved } from "@/lib/auth/require-approved";

const ROUTE = "/api/tasks/[id]/comments";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId } = await params;

  try {
    // Public endpoint — no auth required
    await tryGetCurrentUser(requestId); // ignored, just warms session
    const comments = await listTaskComments(taskId);

    return NextResponse.json(
      {
        items: comments.map((c) => ({
          id: c.id,
          taskId: c.taskId,
          body: c.body,
          createdAt: c.createdAt,
          authorFirstName: c.authorFirstName,
          authorAvatarUrl: c.authorAvatarUrl,
        })),
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} GET: unexpected`, {
      request_id: requestId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId } = await params;

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    const body = await req.json().catch(() => ({})) as { body?: string };
    if (!body.body?.trim()) {
      throw new AppError("VALIDATION_ERROR", "Text komentáře je povinný", 400);
    }

    const tenantId = process.env.DEFAULT_TENANT_ID ?? "";
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    if (!tenantId || !schoolId) {
      throw new AppError("INTERNAL_ERROR", "Chybná konfigurace serveru", 500);
    }

    const comment = await createTaskComment(
      taskId,
      user.id,
      body.body.trim(),
      tenantId,
      schoolId,
      requestId,
    );

    logger.info(`${ROUTE} POST: comment created`, {
      request_id: requestId,
      task_id: taskId,
      comment_id: comment.id,
    });

    return NextResponse.json(
      {
        id: comment.id,
        taskId: comment.taskId,
        body: comment.body,
        createdAt: comment.createdAt,
        authorFirstName: comment.authorFirstName,
        authorAvatarUrl: comment.authorAvatarUrl,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} POST: unexpected`, {
      request_id: requestId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "comments"
```

Expected: no output.

---

## Task 3: Tests — `tests/tasks/comments-route.test.ts`

**Files:**
- Create: `tests/tasks/comments-route.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockTryGetCurrentUser, mockGetCurrentUser, mockListTaskComments, mockCreateTaskComment } = vi.hoisted(() => ({
  mockTryGetCurrentUser: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockListTaskComments: vi.fn(),
  mockCreateTaskComment: vi.fn(),
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  tryGetCurrentUser: mockTryGetCurrentUser,
  getCurrentUser: mockGetCurrentUser,
}));
vi.mock("@/lib/db/task-comments", () => ({
  listTaskComments: mockListTaskComments,
  createTaskComment: mockCreateTaskComment,
}));
vi.mock("@/lib/auth/require-approved", () => ({ requireApproved: vi.fn() }));

import { GET, POST } from "@/app/api/tasks/[id]/comments/route";

const parentUser = { id: "u-parent", email: "p@test.com", roles: ["parent"], approvalStatus: "approved", rejectionReason: null };
const aComment = {
  id: "c-1",
  taskId: "t-1",
  userId: "u-parent",
  body: "Ahoj, budu tam!",
  createdAt: new Date("2026-06-18T10:00:00Z"),
  authorFirstName: "Jana",
  authorAvatarUrl: null,
};

function makeGetRequest(taskId: string) {
  return new NextRequest(`http://localhost/api/tasks/${taskId}/comments`, { method: "GET" });
}

function makePostRequest(taskId: string, body: unknown) {
  return new NextRequest(`http://localhost/api/tasks/${taskId}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: "t-1" });

beforeEach(() => {
  vi.clearAllMocks();
  mockTryGetCurrentUser.mockResolvedValue(null);
  mockGetCurrentUser.mockResolvedValue(parentUser);
  mockListTaskComments.mockResolvedValue([aComment]);
  mockCreateTaskComment.mockResolvedValue(aComment);
  process.env.DEFAULT_TENANT_ID = "tenant-1";
  process.env.DEFAULT_SCHOOL_ID = "school-1";
});

describe("GET /api/tasks/[id]/comments", () => {
  it("returns 200 with comment list for unauthenticated users", async () => {
    const res = await GET(makeGetRequest("t-1"), { params });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: typeof aComment[] };
    expect(body.items).toHaveLength(1);
    expect(body.items[0].body).toBe("Ahoj, budu tam!");
  });

  it("does not expose userId in GET response", async () => {
    const res = await GET(makeGetRequest("t-1"), { params });
    const body = await res.json() as { items: Record<string, unknown>[] };
    expect(body.items[0]).not.toHaveProperty("userId");
  });

  it("returns 200 with empty array when no comments", async () => {
    mockListTaskComments.mockResolvedValue([]);
    const res = await GET(makeGetRequest("t-1"), { params });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[] };
    expect(body.items).toHaveLength(0);
  });
});

describe("POST /api/tasks/[id]/comments", () => {
  it("returns 201 and the new comment for authenticated parent", async () => {
    const res = await POST(makePostRequest("t-1", { body: "Ahoj, budu tam!" }), { params });
    expect(res.status).toBe(201);
    const body = await res.json() as typeof aComment;
    expect(body.body).toBe("Ahoj, budu tam!");
  });

  it("returns 400 when body is empty", async () => {
    const res = await POST(makePostRequest("t-1", { body: "" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body field is missing", async () => {
    const res = await POST(makePostRequest("t-1", {}), { params });
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockRejectedValue(Object.assign(new Error("Unauthenticated"), { constructor: { name: "UnauthenticatedError" } }));
    // Simulate the real UnauthenticatedError from the auth module
    const { UnauthenticatedError } = await import("@/types/errors");
    mockGetCurrentUser.mockRejectedValue(new UnauthenticatedError("Uživatel není přihlášen"));
    const res = await POST(makePostRequest("t-1", { body: "test" }), { params });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/tasks/comments-route.test.ts 2>&1
```

Expected: all tests pass (5 pass, 0 fail).

---

## Task 4: UI component — `components/tasks/TaskCommentThread.tsx`

**Files:**
- Create: `components/tasks/TaskCommentThread.tsx`

- [ ] **Step 1: Write the component**

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";
import { UserAvatar } from "@/components/UserAvatar";

interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
  authorFirstName: string;
  authorAvatarUrl: string | null;
}

interface TaskCommentThreadProps {
  taskId: string;
  authed: boolean;
}

export function TaskCommentThread({ taskId, authed }: TaskCommentThreadProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/comments`);
    if (!res.ok) { setLoadError("Nepodařilo se načíst komentáře."); return; }
    setLoadError(null);
    const data = await res.json() as { items: TaskComment[] };
    setComments(data.items);
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.status === 401) { window.location.href = `/login?next=/tasks/${taskId}`; return; }
      const d = await res.json() as TaskComment & { error?: { message?: string } };
      if (!res.ok) throw new Error((d as unknown as { error?: { message?: string } }).error?.message ?? "Chyba");
      setComments((prev) => [...prev, d]);
      setBody("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">
        Dotazy a komentáře ({comments.length})
      </h3>

      {loading && <p className="text-sm text-gray-400">Načítám…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {comments.length > 0 && (
        <div className="space-y-3 mb-5">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 rounded-xl bg-gray-50 p-3">
              <UserAvatar
                avatarUrl={c.authorAvatarUrl}
                firstName={c.authorFirstName}
                lastName=""
                size="xs"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 mb-0.5">{c.authorFirstName}</p>
                <p className="text-sm text-gray-800 break-words">{c.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(c.createdAt).toLocaleString("cs-CZ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && comments.length === 0 && (
        <p className="text-sm text-gray-400 mb-4">Zatím žádné komentáře.</p>
      )}

      {authed ? (
        <form onSubmit={submit} className="space-y-2">
          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Napište dotaz nebo komentář…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {submitting ? "Odesílám…" : "Odeslat komentář"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500">
          <a href={`/login?next=/tasks/${taskId}`} className="text-blue-600 hover:underline font-medium">
            Přihlaste se
          </a>{" "}
          pro přidání komentáře.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "TaskCommentThread"
```

Expected: no output.

---

## Task 5: Wire component into task detail page

**Files:**
- Modify: `app/(public)/tasks/[id]/page.tsx`

The existing `TaskDetail` component already has `authed` state. Add the import and place `<TaskCommentThread>` at the bottom of the task card (after the closing `</div>` of the edit section, before the outer `</div>`).

- [ ] **Step 1: Add the import**

In `app/(public)/tasks/[id]/page.tsx`, add to the existing imports at the top:

```typescript
import { TaskCommentThread } from "@/components/tasks/TaskCommentThread";
```

- [ ] **Step 2: Add the component inside the task card**

Find this block (line ~521):

```typescript
            </div>
          )}
        </div>
      </div>

    </div>
```

Replace it with:

```typescript
            </div>
          )}

          <TaskCommentThread taskId={id} authed={authed} />
        </div>
      </div>

    </div>
```

That is: add `<TaskCommentThread taskId={id} authed={authed} />` just before the closing `</div>` of the task card (the one with `className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4"`).

- [ ] **Step 3: Type-check the full project**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all tests pass.

---

## Task 6: Update the radiator painting task

The "Malování radiátoru" task exists in the production database. Update it with the date (2026-08-28) and the confirmed description.

- [ ] **Step 1: Find the task ID**

```bash
kubectl -n statex-apps exec deployment/shared -- \
  psql "$DATABASE_URL" -t -c \
  "SELECT id, title, status FROM tasks WHERE title ILIKE '%radiát%' OR title ILIKE '%malování%' LIMIT 5;"
```

If the above kubectl command doesn't work, use the MCP postgres tool to run:
```sql
SELECT id, title, status, deadline, description FROM tasks
WHERE title ILIKE '%radiát%' OR title ILIKE '%malování%'
LIMIT 5;
```

Note the task `id`.

- [ ] **Step 2: Update via PATCH API (from production pod)**

Replace `<TASK_ID>` with the ID found above.

```bash
kubectl -n statex-apps exec deployment/school-committee -- \
  curl -s -X PATCH http://localhost:4800/api/tasks/<TASK_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat /tmp/session_cookie)" \
  -d '{
    "title": "Malování radiátoru",
    "description": "Společná brigáda — malujeme radiátory ve škole.\n\n**Kdy:** 28. srpna 2026\n\n**Materiál:** zajistí spolek\n\n**Občerstvení:** každý může přinést, co upečl",
    "priority": "normal",
    "deadline": "2026-08-28",
    "status": "open"
  }'
```

Alternatively, if you have direct DB access via MCP postgres, run:
```sql
UPDATE tasks
SET
  description = E'Společná brigáda — malujeme radiátory ve škole.\n\n**Kdy:** 28. srpna 2026\n\n**Materiál:** zajistí spolek\n\n**Občerstvení:** každý může přinést, co upečl',
  deadline = '2026-08-28',
  updated_at = NOW()
WHERE id = '<TASK_ID>';
```

- [ ] **Step 3: Verify**

Open `https://strilkove.cz/tasks/<TASK_ID>` and confirm deadline and description show correctly.

---

## Self-Review Checklist

- [x] **Spec coverage:** GET public ✓, POST auth-required ✓, comments list in UI ✓, login prompt for unauthenticated ✓, radiator task update ✓
- [x] **No placeholders:** all code blocks are complete
- [x] **Type consistency:** `TaskCommentWithAuthor` defined in Task 1, used in Task 2; `TaskComment` interface in UI component matches API response shape (no `userId` exposed in GET)
- [x] **Audit pattern:** `writeAuditEvent` called in transaction — matches idea-comments pattern
- [x] **Auth pattern:** `tryGetCurrentUser` for GET (public), `getCurrentUser` + `requireApproved` for POST — matches claim route pattern
