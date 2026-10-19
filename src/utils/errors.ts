/** Error shape every API failure uses: `{ error: { code, message, details? } }`. */
export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    /** Seconds to wait (from the Retry-After header on 429). */
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** The text to show the user for any failure. The API's message is written for end users. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isApiError(error)) {
    if (error.status === 429) {
      return error.retryAfter
        ? `Too many requests. Please wait ${error.retryAfter} seconds and try again.`
        : error.message || "Too many requests. Please wait a moment and try again.";
    }
    if (error.status === 404 && !error.message) return "Not found.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * 422 field errors keyed by field name: `{ email: "value is not a valid email address" }`.
 * Nested fields keep their dotted path (`items.0.description`); the last segment is also set
 * so simple forms can look up `description`.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || error.status !== 422 || !Array.isArray(error.details)) return {};
  const out: Record<string, string> = {};
  for (const item of error.details as FieldError[]) {
    if (!item || typeof item.field !== "string") continue;
    const message = cleanMessage(item.message);
    out[item.field] ??= message;
    const last = item.field.split(".").pop();
    if (last) out[last] ??= message;
  }
  return out;
}

/** Pydantic prefixes some messages with "Value error, ". */
function cleanMessage(message: string): string {
  return String(message ?? "").replace(/^Value error,\s*/i, "");
}

/** 422 with field errors → the first field message; otherwise the general message. */
export function firstErrorMessage(error: unknown, fallback?: string): string {
  const fields = fieldErrors(error);
  const first = Object.values(fields)[0];
  return first ? first : errorMessage(error, fallback);
}

export function hasCode(error: unknown, code: string): boolean {
  return isApiError(error) && error.code === code;
}
