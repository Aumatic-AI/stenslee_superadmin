// Bare storage keys ("org-library/<org id>/<uuid>.<ext>"), never full URLs
// -- see studio's src/lib/image-src.ts for the full rationale. This app
// only ever displays its own Supabase Storage objects (no external/Pinterest
// URLs to pass through), so this is the simple half of that file: no
// same-origin proxy branch needed.
const SUPABASE_STORAGE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const STORAGE_BASE_URL = `${SUPABASE_STORAGE_ORIGIN}/storage/v1/object/public`;

export function getStorageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${STORAGE_BASE_URL}/${key}`;
}
