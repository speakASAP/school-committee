import type { ReactNode } from "react";

// Role guard is enforced at middleware level and at each API route.
// This layout provides the admin shell UI only.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white p-4 space-y-2">
        <h2 className="text-lg font-bold mb-4">Admin</h2>
        <nav className="space-y-1">
          <a href="/admin/approvals" className="block rounded px-3 py-2 hover:bg-gray-700">Approvals</a>
          <a href="/admin/users" className="block rounded px-3 py-2 hover:bg-gray-700">Users</a>
          <a href="/admin/tasks" className="block rounded px-3 py-2 hover:bg-gray-700">Tasks</a>
          <a href="/admin/payments" className="block rounded px-3 py-2 hover:bg-gray-700">Payments</a>
          <a href="/admin/feedback" className="block rounded px-3 py-2 hover:bg-gray-700">Feedback</a>
          <a href="/admin/ideas" className="block rounded px-3 py-2 hover:bg-gray-700">Nápady</a>
          <a href="/admin/exports" className="block rounded px-3 py-2 hover:bg-gray-700">Exports</a>
        </nav>
        <div className="pt-4 mt-4 border-t border-gray-700">
          <a href="/dashboard" className="block rounded px-3 py-2 text-gray-400 hover:bg-gray-700 hover:text-white text-sm">← Dashboard</a>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
