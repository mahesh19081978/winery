import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Maps staff management errors to HTTP responses.
 * Validation issues, authorization denials (statusCode) and unknown failures.
 */
export function staffErrorResponse(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    const message = error.issues[0]?.message || 'Validation failed';
    return NextResponse.json({ success: false, error: message, details: error.issues }, { status: 400 });
  }

  const statusCode = (error as { statusCode?: number })?.statusCode;
  if (statusCode) {
    const message = error instanceof Error ? error.message : fallback;
    return NextResponse.json({ success: false, error: message }, { status: statusCode });
  }

  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
