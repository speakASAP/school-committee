"use client";
import { useState } from "react";

interface VoteButtonProps {
  ideaId: string;
  initialCount: number;
  initialVoted: boolean;
  disabled?: boolean;
}

export function VoteButton({ ideaId, initialCount, initialVoted, disabled }: VoteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/vote`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { voted: boolean; voteCount: number };
        setVoted(data.voted);
        setCount(data.voteCount);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled || loading}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors
        ${voted ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span>{voted ? "★" : "☆"}</span>
      <span>{count}</span>
    </button>
  );
}
