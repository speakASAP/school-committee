import { CreateTaskWizard } from "@/components/tasks/CreateTaskWizard";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  let schoolId = "";
  let tenantId = "";
  try {
    const user = await getCurrentUser();
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: { schoolId: true, tenantId: true },
    });
    schoolId = profile?.schoolId ?? process.env.DEFAULT_SCHOOL_ID ?? "";
    tenantId = profile?.tenantId ?? process.env.DEFAULT_TENANT_ID ?? "";
  } catch {
    // unauthenticated — middleware will redirect
  }

  return (
    <div className="py-6 px-4">
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Vytvořit úkol pro rodiče</h1>
      <CreateTaskWizard schoolId={schoolId} tenantId={tenantId} />
    </div>
  );
}
