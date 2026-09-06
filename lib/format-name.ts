export function formatName(p: {
  titleBefore?: string | null;
  firstName: string;
  lastName: string;
  titleAfter?: string | null;
}): string {
  const parts: string[] = [];
  if (p.titleBefore?.trim()) parts.push(p.titleBefore.trim());
  if (p.firstName?.trim()) parts.push(p.firstName.trim());
  if (p.lastName?.trim()) parts.push(p.lastName.trim());
  if (p.titleAfter?.trim()) parts.push(p.titleAfter.trim());
  return parts.join(" ");
}
