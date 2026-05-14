"use client";
import { useEffect, useState } from "react";

const MESSAGES = [
  "Nahrávám média...",
  "Přepisuji hlas...",
  "AI zpracovává úkol...",
  "Skoro hotovo...",
];

export function WizardStep2Processing() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      <p className="text-sm text-gray-600 font-medium">{MESSAGES[msgIndex]}</p>
    </div>
  );
}
