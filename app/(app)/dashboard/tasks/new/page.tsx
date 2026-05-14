import { CreateTaskWizard } from "@/components/tasks/CreateTaskWizard";

export default function NewTaskPage() {
  const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
  const tenantId = process.env.DEFAULT_TENANT_ID ?? "";

  return (
    <div className="py-6 px-4">
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Vytvořit úkol pro rodiče</h1>
      <CreateTaskWizard schoolId={schoolId} tenantId={tenantId} />
    </div>
  );
}
