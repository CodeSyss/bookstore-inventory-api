/** Field name (as sent by the API) to the list of messages that apply to it. */
export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export type ApiErrorCode =
  | 'validation_error'
  | 'not_found'
  | 'method_not_allowed'
  | 'service_unavailable'
  | 'internal_error'
  | 'network_error'
  | 'error';

export const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
const INTERNAL_ERROR_MESSAGE = 'Ocurrió un error interno en el servidor. Inténtalo de nuevo más tarde.';
const VALIDATION_ERROR_MESSAGE = 'Los datos enviados no son válidos.';
const NOT_FOUND_MESSAGE = 'El recurso solicitado no existe.';
const UNAVAILABLE_MESSAGE = 'El servicio no está disponible temporalmente. Inténtalo de nuevo más tarde.';
const GENERIC_ERROR_MESSAGE = 'No se pudo completar la operación.';

/**
 * Normalised failure of an API call. The interceptor converts every HTTP failure
 * into this type so that callers never deal with `HttpErrorResponse` directly.
 * Deliberately framework-free so the application layer can depend on it.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details: FieldErrors | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Builds an error from an HTTP status and the (already parsed) response body. */
  static fromResponse(status: number, body: unknown): ApiError {
    if (status === 0) {
      return new ApiError(0, 'network_error', NETWORK_ERROR_MESSAGE);
    }

    const payload = isRecord(body) ? body : {};
    const rawMessage = payload['message'];
    const serverMessage = typeof rawMessage === 'string' && rawMessage.trim() ? rawMessage : null;
    const code = toErrorCode(payload['error'], status);
    const details = normalizeFieldErrors(payload['details']);

    return new ApiError(status, code, messageFor(status, serverMessage), details);
  }

  /** Wraps anything thrown (including non-API failures) into an {@link ApiError}. */
  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    return new ApiError(500, 'error', GENERIC_ERROR_MESSAGE);
  }
}

function messageFor(status: number, serverMessage: string | null): string {
  switch (status) {
    case 400:
      return serverMessage ?? VALIDATION_ERROR_MESSAGE;
    case 404:
      return serverMessage ?? NOT_FOUND_MESSAGE;
    case 503:
      return serverMessage ?? UNAVAILABLE_MESSAGE;
    case 500:
      // Never surface internals: always show the generic message for server faults.
      return INTERNAL_ERROR_MESSAGE;
    default:
      return status >= 500 ? INTERNAL_ERROR_MESSAGE : (serverMessage ?? GENERIC_ERROR_MESSAGE);
  }
}

function toErrorCode(value: unknown, status: number): ApiErrorCode {
  const known: readonly ApiErrorCode[] = [
    'validation_error',
    'not_found',
    'method_not_allowed',
    'service_unavailable',
    'internal_error',
  ];
  const match = known.find((code) => code === value);
  if (match) return match;
  if (status === 400) return 'validation_error';
  if (status === 404) return 'not_found';
  if (status === 503) return 'service_unavailable';
  if (status >= 500) return 'internal_error';
  return 'error';
}

/** Accepts `{field: "msg"}` and `{field: ["msg", ...]}`; ignores anything else. */
export function normalizeFieldErrors(raw: unknown): FieldErrors | null {
  if (!isRecord(raw)) return null;
  const result: Record<string, readonly string[]> = {};
  for (const [field, value] of Object.entries(raw)) {
    const messages = (Array.isArray(value) ? value : [value]).filter(
      (item): item is string => typeof item === 'string' && item.length > 0,
    );
    if (messages.length > 0) result[field] = messages;
  }
  return Object.keys(result).length > 0 ? result : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
