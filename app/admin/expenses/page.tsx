"use client";
import { useState } from "react";

const EXPENSE_CATEGORIES = ["supplies", "maintenance", "events", "transport", "catering", "other"];

export default function ExpensesPage() {
  const [form, setForm] = useState({
    schoolId: "", tenantId: "", title: "", category: "supplies",
    amountCzk: "", spentAt: "", publicVisible: false, description: "",
  });
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createExpense() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          amountCzk: parseFloat(form.amountCzk),
        }),
      });
      const body = await res.json();
      if (!res.ok) setResult(`Error: ${body.error?.message ?? res.status}`);
      else setResult(`Expense created: ${body.expense.id}`);
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  const field = (key: keyof typeof form, label: string, type = "text") => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        className="w-full border rounded px-3 py-2 text-sm"
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Create Expense</h1>
      <div className="space-y-3">
        {field("schoolId", "School ID")}
        {field("tenantId", "Tenant ID")}
        {field("title", "Title")}
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {field("amountCzk", "Amount (CZK)", "number")}
        {field("spentAt", "Spent At", "date")}
        {field("description", "Description (optional)")}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.publicVisible}
            onChange={(e) => setForm({ ...form, publicVisible: e.target.checked })}
          />
          Visible on public report
        </label>
        <button
          onClick={createExpense}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Expense"}
        </button>
        {result && <p className="text-sm mt-2">{result}</p>}
      </div>
    </div>
  );
}
