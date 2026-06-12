import { NextResponse } from "next/server";

/**
 * Standard API response shape for all endpoints
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Return a successful response
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, {
    status,
  });
}

/**
 * Return an error response
 */
export function errorResponse(
  error: string,
  status = 400
): NextResponse {
  return NextResponse.json({ success: false, error } satisfies ApiResponse, {
    status,
  });
}

/**
 * Return a response with a message (no data)
 */
export function messageResponse(message: string, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, message } satisfies ApiResponse,
    { status }
  );
}

/**
 * Pagination helper for cursor-based pagination
 */
export interface PaginationParams {
  cursor?: string;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export function parsePagination(
  searchParams: URLSearchParams
): PaginationParams {
  return {
    cursor: searchParams.get("cursor") ?? undefined,
    limit: Math.min(parseInt(searchParams.get("limit") ?? "20"), 100),
  };
}
