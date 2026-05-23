import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { db } from "@/lib/db/client";
import { toErrorResponse, AppError } from "@/types/errors";

const COMMITTEE_ROLES = new Set(["committee", "admin", "school_staff"]);

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    if (!user.roles?.some((r: string) => COMMITTEE_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Pouze výbor může zobrazit schránku", 403);
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("type") ?? "all"; // all | messages | feedback | ideas
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 200);

    const userIds = new Set<string>();
    const items: InboxItem[] = [];

    if (filter === "all" || filter === "messages") {
      // Top-level messages only (not replies) — replies shown inline
      const messages = await db.message.findMany({
        where: { schoolId, isFromCommittee: false, parentId: null },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { replies: { orderBy: { createdAt: "asc" } } },
      });
      for (const m of messages) {
        userIds.add(m.fromUserId);
        items.push({
          kind: "message",
          id: m.id,
          userId: m.fromUserId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          status: m.replies.length > 0 ? "replied" : "new",
          replies: m.replies.map((r) => ({
            id: r.id,
            body: r.body,
            fromUserId: r.fromUserId,
            isFromCommittee: r.isFromCommittee,
            createdAt: r.createdAt.toISOString(),
          })),
        });
      }
    }

    if (filter === "all" || filter === "feedback") {
      const feedback = await db.feedbackItem.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      for (const f of feedback) {
        if (f.userId) userIds.add(f.userId);
        items.push({
          kind: "feedback",
          id: f.id,
          userId: f.isAnonymous ? null : f.userId,
          body: f.text,
          createdAt: f.createdAt.toISOString(),
          status: f.status,
          meta: { type: f.type, categories: f.categories, isAnonymous: f.isAnonymous },
        });
      }
    }

    if (filter === "all" || filter === "ideas") {
      const ideas = await db.idea.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { _count: { select: { votes: true, comments: true } } },
      });
      for (const i of ideas) {
        if (i.submittedBy) userIds.add(i.submittedBy);
        items.push({
          kind: "idea",
          id: i.id,
          userId: i.isAnonymous ? null : i.submittedBy,
          body: `**${i.title}**\n\n${i.description}`,
          createdAt: i.createdAt.toISOString(),
          status: i.status,
          meta: {
            title: i.title,
            categories: i.categories,
            isAnonymous: i.isAnonymous,
            votes: i._count.votes,
            comments: i._count.comments,
          },
        });
      }
    }

    // Sort all by date desc
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Resolve user profiles for non-anonymous items
    const profiles = userIds.size > 0
      ? await db.profile.findMany({
          where: { userId: { in: [...userIds] } },
          select: { userId: true, firstName: true, lastName: true, titleBefore: true, titleAfter: true },
        })
      : [];
    const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));

    const enriched = items.map((item) => ({
      ...item,
      user: item.userId ? profileMap[item.userId] ?? null : null,
    }));

    return NextResponse.json({ items: enriched }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}

interface InboxItem {
  kind: "message" | "feedback" | "idea";
  id: string;
  userId: string | null;
  body: string;
  createdAt: string;
  status: string;
  replies?: { id: string; body: string; fromUserId: string; isFromCommittee: boolean; createdAt: string }[];
  meta?: Record<string, unknown>;
}
