interface UserAvatarProps {
  avatarUrl: string | null | undefined;
  firstName: string;
  lastName?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "w-7 h-7 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-11 h-11 text-base",
  lg: "w-20 h-20 text-2xl",
};

// Deterministic gradient palette derived from name
const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-orange-400 to-red-500",
  "from-emerald-500 to-teal-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-violet-600",
  "from-amber-400 to-orange-500",
];

function pickGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function UserAvatar({ avatarUrl, firstName, lastName = "", size = "md", className = "" }: UserAvatarProps) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const sizeClass = SIZE_CLASSES[size];
  const gradient = pickGradient(firstName + lastName);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        className={`${sizeClass} rounded-full object-cover shrink-0 border-2 border-white shadow-sm ${className}`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-bold shrink-0 shadow-sm select-none ${className}`}
    >
      {initials}
    </span>
  );
}
