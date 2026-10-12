import { NextResponse } from "next/server";

/**
 * Standard API response shape for all endpoints
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
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
 * Return an error response with human-readable error and optional machine code
 */
export function errorResponse(
  error: string,
  status = 400,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(code ? { code } : {}),
    } satisfies ApiResponse,
    { status }
  );
}

/**
 * Return a response with a message
 */
export function messageResponse(message: string, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, data: { message }, message } satisfies ApiResponse,
    { status }
  );
}

/**
 * Standard pagination response format for API list endpoints
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  perPage: number,
  status = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data: {
        items,
        total,
        page,
        perPage,
        hasMore: page * perPage < total,
      },
    } satisfies ApiResponse<PaginatedData<T>>,
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

export interface PaginatedCursorResponse<T> {
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

