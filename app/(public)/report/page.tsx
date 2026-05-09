import { Suspense } from "react";

interface ReportData {
  totalCollectedCzk: number;
  totalSpentCzk: number;
  balanceCzk: number;
  completedTaskCount: number;
  expenses: { id: string; title: string; category: string; amountCzk: number; spentAt: string }[];
}

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
      <section className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-sm text-gray-500">Collected</p>
          <p className="text-2xl font-bold text-green-600">{data.totalCollectedCzk.toLocaleString("cs-CZ")} Kč</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-sm text-gray-500">Spent</p>
          <p className="text-2xl font-bold text-red-600">{data.totalSpentCzk.toLocaleString("cs-CZ")} Kč</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-sm text-gray-500">Balance</p>
          <p className="text-2xl font-bold text-blue-600">{data.balanceCzk.toLocaleString("cs-CZ")} Kč</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Completed volunteer tasks: {data.completedTaskCount}</h2>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Expenses</h2>
        {data.expenses.length === 0 ? (
          <p className="text-gray-500">No expenses recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.expenses.map((e) => (
              <li key={e.id} className="bg-white rounded border p-3 flex justify-between items-center">
                <span>
                  <span className="font-medium">{e.title}</span>
                  <span className="ml-2 text-xs text-gray-400">{e.category}</span>
                </span>
                <span className="text-red-600 font-medium">{e.amountCzk.toLocaleString("cs-CZ")} Kč</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const { schoolId } = await searchParams;
  if (!schoolId) {
    return <p className="text-red-600">schoolId parameter is required.</p>;
  }
  return (
    <Suspense fallback={<p>Loading report…</p>}>
      <ReportContent schoolId={schoolId} />
    </Suspense>
  );
}
