import type { Class } from "@prisma/client";
import { db } from "@/lib/db/client";
import { buildPage, resolveLimit, type PageParams, type PageResult } from "@/lib/db/pagination";

export async function listClasses(
  schoolId: string,
  params?: PageParams,
): Promise<PageResult<Class>> {
  const limit = resolveLimit(params?.limit);
  const rows = await db.class.findMany({
    where: { schoolId },
    orderBy: { schoolYear: "desc" },
    take: limit + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });
  return buildPage(rows, limit);
}
