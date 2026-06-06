/**
 * Shared validation for user-uploaded files (confirmation files / approval
 * screenshots). Enforces a size cap and an allow-list of content types, and
 * derives the stored extension from the validated MIME type rather than the
 * client-supplied filename — so a caller can't smuggle an arbitrary extension.
 *
 * Note: `file.type` is client-controlled, so this is a policy gate, not a
 * content guarantee. Magic-byte sniffing would be a stronger follow-up.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
]);

const MAX_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

/** Returns an error message if the file is invalid, or null if it's accepted. */
export function validateUpload(file: File): string | null {
  if (file.size === 0) return "File is empty";
  if (file.size > MAX_UPLOAD_BYTES) return `File exceeds the ${MAX_MB}MB limit`;
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Unsupported file type (allowed: PNG, JPEG, GIF, WebP, PDF)";
  }
  return null;
}

/** Server-derived extension based on the validated MIME type (incl. leading dot). */
export function safeExtension(file: File): string {
  return ALLOWED_TYPES.get(file.type) ?? "";
}
