"use client";
import Link from "next/link";

interface WizardStep4ConfirmProps {
  taskId: string;
}

export function WizardStep4Confirm({ taskId }: WizardStep4ConfirmProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✓</div>
      <h2 className="text-xl font-bold text-gray-900">Úkol publikován!</h2>
      <p className="text-sm text-gray-500">Rodiče nyní mohou úkol vidět a přihlásit se k němu.</p>
      <Link href={`/tasks/${taskId}`} className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">
        Zobrazit úkol
      </Link>
    </div>
  );
}
