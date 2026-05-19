import { Suspense } from "react";
import ReactMarkdown from "react-markdown";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  deadline: string | null;
  responsibleName: string | null;
  finishedAt: string | null;
  createdAt: string;
}

interface ReportData {
  totalCollectedCzk: number;
  totalSpentCzk: number;
  balanceCzk: number;
  completedTaskCount: number;
  expenses: { id: string; title: string; category: string; amountCzk: number; spentAt: string }[];
  allTasks: TaskItem[];
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  completed: { label: "Dokončeno", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  verified:  { label: "Ověřeno",   bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  reserved:  { label: "Probíhá",   bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500" },
  claimed:   { label: "Probíhá",   bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500" },
  open:      { label: "Plánováno", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
};

async function fetchReport(schoolId: string): Promise<ReportData> {
  const base = process.env.APP_BASE_URL ?? "http://localhost:4800";
  const res = await fetch(`${base}/api/public/report?schoolId=${schoolId}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error("Failed to load report");
  return res.json();
}

async function ReportContent({ schoolId }: { schoolId: string }) {
  const data = await fetchReport(schoolId);

  return (
    <div className="space-y-8">
      {/* Tasks */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Úkoly a projekty výboru</h2>
        {data.allTasks.length === 0 ? (
          <p className="text-sm text-gray-400">Zatím žádné úkoly.</p>
        ) : (
          <div className="space-y-4">
            {data.allTasks.map((task) => {
              const cfg = STATUS_CONFIG[task.status] ?? { label: task.status, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
              return (
                <div key={task.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        {task.status === "open" && task.deadline && (
                          <span className="text-xs text-gray-400">
                            Zahájení: {new Date(task.deadline).toLocaleDateString("cs-CZ", { month: "long", year: "numeric" })}
                          </span>
                        )}
                        {(task.status === "completed" || task.status === "verified") && task.finishedAt && (
                          <span className="text-xs text-gray-400">
                            Dokončeno: {new Date(task.finishedAt).toLocaleDateString("cs-CZ")}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-gray-900">{task.title}</h3>
                    </div>
                    {task.responsibleName && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500">Zodpovědná osoba</p>
                        <p className="text-sm font-semibold text-gray-700">{task.responsibleName}</p>
                      </div>
                    )}
                  </div>
                  <div className="prose prose-sm prose-gray max-w-none text-gray-600">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mt-3 mb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-bold text-gray-900 mt-3 mb-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-800 mt-2 mb-1">{children}</h3>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        p: ({ children }) => <p className="mb-2 leading-relaxed text-sm text-gray-600">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5 text-sm text-gray-600">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5 text-sm text-gray-600">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        hr: () => <hr className="my-3 border-gray-200" />,
                      }}
                    >
                      {task.description}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Financial transparency */}
      {(data.totalCollectedCzk > 0 || data.totalSpentCzk > 0 || data.expenses.length > 0) && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Transparentnost hospodaření</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                <p className="text-sm text-gray-500">Vybráno</p>
                <p className="text-2xl font-bold text-green-600">{data.totalCollectedCzk.toLocaleString("cs-CZ")} Kč</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                <p className="text-sm text-gray-500">Vydáno</p>
                <p className="text-2xl font-bold text-red-600">{data.totalSpentCzk.toLocaleString("cs-CZ")} Kč</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                <p className="text-sm text-gray-500">Zůstatek</p>
                <p className="text-2xl font-bold text-blue-600">{data.balanceCzk.toLocaleString("cs-CZ")} Kč</p>
              </div>
            </div>

            {data.expenses.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Výdaje</h3>
                <ul className="space-y-2">
                  {data.expenses.map((e) => (
                    <li key={e.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex justify-between items-center shadow-sm">
                      <span>
                        <span className="font-medium text-gray-900">{e.title}</span>
                        <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{e.category}</span>
                      </span>
                      <span className="text-red-600 font-semibold">{e.amountCzk.toLocaleString("cs-CZ")} Kč</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const { schoolId: schoolIdParam } = await searchParams;
  const schoolId = schoolIdParam || process.env.DEFAULT_SCHOOL_ID;

  if (!schoolId) {
    return (
      <main className="max-w-4xl mx-auto w-full px-4 py-8">
        <p className="text-red-600">Konfigurace školy chybí.</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto w-full px-4 py-8 space-y-8">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Zpráva o činnosti výboru</h1>
        <p className="text-sm text-gray-500 mt-1">Přehled toho, co jsme jako školní výbor dosud udělali a co plánujeme</p>
      </div>
      <Suspense fallback={<p className="text-sm text-gray-400">Načítám…</p>}>
        <ReportContent schoolId={schoolId} />
      </Suspense>
    </main>
  );
}
