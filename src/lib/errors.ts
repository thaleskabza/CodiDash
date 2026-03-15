import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ---- HTTP status code helpers ----
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

// ---- AppError class ----
export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    code = "INTERNAL_ERROR",
    isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code = "BAD_REQUEST"): AppError {
    return new AppError(message, HttpStatus.BAD_REQUEST, code);
  }

  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED"): AppError {
    return new AppError(message, HttpStatus.UNAUTHORIZED, code);
  }

  static forbidden(message = "Forbidden", code = "FORBIDDEN"): AppError {
    return new AppError(message, HttpStatus.FORBIDDEN, code);
  }

  static notFound(resource: string, code = "NOT_FOUND"): AppError {
    return new AppError(`${resource} not found`, HttpStatus.NOT_FOUND, code);
  }

  static conflict(message: string, code = "CONFLICT"): AppError {
    return new AppError(message, HttpStatus.CONFLICT, code);
  }

  static unprocessable(message: string, code = "VALIDATION_ERROR"): AppError {
    return new AppError(message, HttpStatus.UNPROCESSABLE_ENTITY, code);
  }
}

// ---- Error response formatter ----
export interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  details?: unknown;
}

export function formatErrorResponse(error: unknown): {
  response: ErrorResponse;
  statusCode: HttpStatusCode;
} {
  if (error instanceof AppError) {
    return {
      response: {
        error: error.name,
        code: error.code,
        message: error.message,
      },
      statusCode: error.statusCode,
    };
  }

  if (error instanceof ZodError) {
    return {
      response: {
        error: "ValidationError",
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        details: error.flatten().fieldErrors,
      },
      statusCode: HttpStatus.BAD_REQUEST,
    };
  }

  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message =
      process.env.NODE_ENV === "development"
        ? error.message
        : "An unexpected error occurred";

    return {
      response: {
        error: "InternalError",
        code: "INTERNAL_ERROR",
        message,
      },
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    response: {
      error: "UnknownError",
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred",
    },
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  };
}

// ---- Next.js API route error response helper ----
export function errorResponse(error: unknown): NextResponse<ErrorResponse> {
  const { response, statusCode } = formatErrorResponse(error);
  return NextResponse.json(response, { status: statusCode });
}

// ---- Success response helpers ----
export function successResponse<T>(data: T, status = HttpStatus.OK): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: HttpStatus.CREATED });
}
