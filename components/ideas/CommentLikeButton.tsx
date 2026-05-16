"use client";
import { useState } from "react";

interface CommentLikeButtonProps {
  ideaId: string;
  commentId: string;
  initialCount: number;
  initialLiked: boolean;
  isOwn: boolean;
}

export function CommentLikeButton({ ideaId, commentId, initialCount, initialLiked, isOwn }: CommentLikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (isOwn || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/comments/${commentId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { liked: boolean; likeCount: number };
        setLiked(data.liked);
        setCount(data.likeCount);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={isOwn || loading}
      className={`flex items-center gap-1 text-xs rounded px-2 py-0.5 transition-colors
        ${liked ? "text-red-600" : "text-gray-400 hover:text-red-400"}
        ${isOwn ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      <span>♥</span>
      <span>{count}</span>
    </button>
  );
}
