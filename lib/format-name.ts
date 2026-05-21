export function formatName(p: {
  titleBefore?: string | null;
  firstName: string;
  lastName: string;
  titleAfter?: string | null;
}): string {
  const parts: string[] = [];
  if (p.titleBefore?.trim()) parts.push(p.titleBefore.trim());
  parts.push(p.firstName, p.lastName);
  if (p.titleAfter?.trim()) parts.push(p.titleAfter.trim());
  return parts.join(" ");
}
