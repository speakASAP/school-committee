import { db } from "@/lib/db/client";

export async function listEvents(opts: {
  schoolId: string;
  upcoming?: boolean;
  limit?: number;
  cursor?: string;
}) {
  const limit = Math.min(opts.limit ?? 20, 100);

  const items = await db.event.findMany({
    where: {
      schoolId: opts.schoolId,
      ...(opts.upcoming ? { startsAt: { gte: new Date() } } : {}),
      ...(opts.cursor ? { startsAt: { gt: new Date(opts.cursor) } } : {}),
    },
    include: {
      registrations: { select: { userId: true, status: true } },
    },
    orderBy: { startsAt: "asc" },
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;

  return {
    items: page.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location,
      capacity: event.capacity,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      registrationCount: event.registrations.filter((r) => r.status === "registered").length,
      registeredUserIds: event.registrations.filter((r) => r.status === "registered").map((r) => r.userId),
    })),
    nextCursor: hasMore ? page[page.length - 1].startsAt.toISOString() : null,
  };
}

export async function createEvent(data: {
  schoolId: string;
  createdBy: string;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt?: Date;
  location?: string;
  capacity?: number;
}) {
  return db.event.create({
    data: {
      schoolId: data.schoolId,
      createdBy: data.createdBy,
      title: data.title,
      description: data.description ?? null,
      startsAt: data.startsAt,
      endsAt: data.endsAt ?? null,
      location: data.location ?? null,
      capacity: data.capacity ?? null,
    },
  });
}

export async function getEvent(id: string) {
  return db.event.findUnique({ where: { id } });
}

export async function registerForEvent(eventId: string, userId: string) {
  return db.eventRegistration.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, status: "registered" },
    update: { status: "registered" },
  });
}

export async function cancelEventRegistration(eventId: string, userId: string) {
  return db.eventRegistration.updateMany({
    where: { eventId, userId },
    data: { status: "cancelled" },
  });
}

export async function getRegistration(eventId: string, userId: string) {
  return db.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
}
