import Link from "next/link";
import { VoteButton } from "./VoteButton";
import { UserAvatar } from "@/components/UserAvatar";

interface IdeaCardProps {
  id: string;
  title: string;
  description: string;
  isAnonymous: boolean;
  authorId: string | null;
  authorName?: string;
  authorAvatarUrl?: string | null;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  hasVoted: boolean;
  isOwnIdea: boolean;
  isAuthenticated: boolean;
}

export function IdeaCard({
  id, title, description, isAnonymous, authorId: _authorId, authorName, authorAvatarUrl,
  voteCount, commentCount, createdAt, hasVoted, isOwnIdea, isAuthenticated,
}: IdeaCardProps) {
  const displayAuthor = isAnonymous ? "Anonymní" : (authorName ?? "Rodič");
  const canVote = isAuthenticated && !isOwnIdea;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/ideas/${id}`}>
        <h3 className="font-semibold text-gray-900 mb-1 hover:text-blue-700">{title}</h3>
      </Link>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{description}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          {!isAnonymous && authorName && (
            <UserAvatar avatarUrl={authorAvatarUrl} firstName={authorName.split(" ")[0] ?? ""} lastName={authorName.split(" ")[1] ?? ""} size="xs" />
          )}
          <span>{displayAuthor} · {new Date(createdAt).toLocaleDateString("cs-CZ")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/ideas/${id}#comments`} className="hover:text-blue-600">
            💬 {commentCount}
          </Link>
          <VoteButton
            ideaId={id}
            initialCount={voteCount}
            initialVoted={hasVoted}
            disabled={!canVote}
          />
        </div>
      </div>
    </div>
  );
}
