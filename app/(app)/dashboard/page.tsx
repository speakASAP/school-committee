"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  roles: string[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => null);
  }, []);

  const isAdmin = user?.roles.includes("admin") || user?.roles.includes("committee");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        {user && <p className="text-sm text-gray-500 mt-1">{user.email}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/tasks" className="block bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-gray-900">Volunteer Tasks</h2>
          <p className="text-sm text-gray-500 mt-1">Browse and claim open tasks</p>
        </Link>
        <Link href="/payments" className="block bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-gray-900">Payments</h2>
          <p className="text-sm text-gray-500 mt-1">Generate QR payment for school contributions</p>
        </Link>
        <Link href="/feedback" className="block bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-gray-900">Feedback</h2>
          <p className="text-sm text-gray-500 mt-1">Submit suggestions, questions or praise</p>
        </Link>
        <Link href="/report" className="block bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-gray-900">Transparency Report</h2>
          <p className="text-sm text-gray-500 mt-1">See how collected funds are used</p>
        </Link>
      </div>

      {isAdmin && (
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Admin</p>
          <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">
            Go to admin panel →
          </Link>
        </div>
      )}

      <div className="border-t pt-4">
        <Link href="/account/delete" className="text-xs text-gray-400 hover:text-gray-600">
          Request account deletion
        </Link>
      </div>
    </div>
  );
}
