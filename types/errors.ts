export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "EMAIL_NOT_VERIFIED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TASK_ALREADY_CLAIMED"
  | "PAYMENT_ALREADY_CONFIRMED"
  | "AI_DRAFT_FAILED"
  | "RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ErrorCode;
  message: string;
  requestId?: string;
  fields?: Record<string, string>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHENTICATED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export function toErrorResponse(
  error: AppError,
  requestId?: string,
): ApiErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      requestId,
    },
  };
}
