"use client";
import { useRouter } from "next/navigation";

const LANGUAGES = [
  { code: "cs", label: "Čeština" },
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "uk", label: "Українська" },
] as const;

export default function LanguageSelectionPage() {
  const router = useRouter();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Select language</h1>
      <p className="text-sm text-gray-500 mb-6">Vyberte jazyk / Выберите язык / Оберіть мову</p>
      <ul className="space-y-3">
        {LANGUAGES.map((lang) => (
          <li key={lang.code}>
            <button
              onClick={() => router.push(`/onboarding/profile?lang=${lang.code}`)}
              className="block w-full rounded-xl border p-4 text-center text-lg font-medium hover:bg-gray-50 transition-colors"
            >
              {lang.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
