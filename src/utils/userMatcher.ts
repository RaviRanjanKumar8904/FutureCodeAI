/**
 * User Matching Utility
 * Authoritatively matches records against an authenticated user.
 * Prioritizes UID and lowercase normalized Email to prevent false positives.
 */
export function matchesUser(
  user: { uid?: string; email?: string | null; displayName?: string | null } | null | undefined,
  targetEmail?: string | null,
  targetName?: string | null,
  targetId?: string | null
): boolean {
  if (!user) return false;

  const uEmail = (user.email || '').toLowerCase().trim();
  const uName = (user.displayName || '').toLowerCase().trim();
  const uUid = (user.uid || '').trim();

  const tEmail = (targetEmail || '').toLowerCase().trim();
  const tName = (targetName || '').toLowerCase().trim();
  const tId = (targetId || '').trim();

  // 1. Direct UID match
  if (tId && uUid && tId === uUid) return true;

  // 2. Email match (most authoritative for student records)
  if (tEmail && uEmail) {
    if (tEmail === uEmail) return true;
    // If both emails are present but different, they are definitely distinct users
    return false;
  }

  // 3. Fallback name match ONLY if email is not present on target record
  if (!tEmail && tName && uName && tName.length >= 3 && uName.length >= 3) {
    if (tName === uName) return true;
  }

  return false;
}
