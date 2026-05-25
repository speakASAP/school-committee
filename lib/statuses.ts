// Unified status vocabulary for all content entities.
//
// Tasks:    draft → open → reserved → claimed → completed → verified
// Ideas:    submitted → in_review → approved → implemented | rejected | deleted
// Feedback: submitted → in_review → resolved → archived | deleted

export const TASK_STATUSES = ["draft", "open", "reserved", "claimed", "completed", "verified"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

export const IDEA_STATUSES = ["submitted", "in_review", "approved", "rejected", "implemented", "deleted"] as const;
export type IdeaStatus = typeof IDEA_STATUSES[number];

export const IDEA_ADMIN_STATUSES = ["submitted", "in_review", "approved", "rejected", "implemented"] as const;

export const FEEDBACK_STATUSES = ["submitted", "in_review", "resolved", "archived", "deleted"] as const;
export type FeedbackStatus = typeof FEEDBACK_STATUSES[number];

export const FEEDBACK_ADMIN_STATUSES = ["submitted", "in_review", "resolved", "archived"] as const;

export const STATUS_LABEL: Record<string, string> = {
  // Task
  draft: "Koncept",
  open: "Otevřený",
  reserved: "Zaplánováno",
  claimed: "Probíhá",
  completed: "Dokončený — čeká na ověření",
  verified: "Ověřený",
  // Shared content lifecycle
  submitted: "Podáno",
  in_review: "V přezkoumání",
  approved: "Schváleno",
  rejected: "Zamítnuto",
  implemented: "Realizováno",
  resolved: "Vyřešeno",
  archived: "Archivováno",
  deleted: "Smazáno",
  // Synthetic (messages inbox — derived, not stored)
  new: "Nové",
  replied: "Odpovězeno",
};

export const STATUS_COLOR: Record<string, string> = {
  // Task
  draft: "bg-gray-100 text-gray-500",
  open: "bg-blue-100 text-blue-700",
  reserved: "bg-yellow-100 text-yellow-700",
  claimed: "bg-orange-100 text-orange-700",
  completed: "bg-purple-100 text-purple-700",
  verified: "bg-green-100 text-green-700",
  // Shared content lifecycle
  submitted: "bg-blue-100 text-blue-700",
  in_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  implemented: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
  deleted: "bg-gray-100 text-gray-400",
  // Synthetic (messages inbox)
  new: "bg-red-100 text-red-700",
  replied: "bg-green-100 text-green-700",
};
