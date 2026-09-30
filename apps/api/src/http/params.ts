import { z } from 'zod';

import { ProblemError } from './problem.js';

export function notFound(resource: string) {
  return new ProblemError(404, 'Not Found', `${resource} not found.`);
}

/** Validates a UUID path param; a malformed id is just "not found". */
export function idParam(value: unknown, resource: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw notFound(resource);
  return parsed.data;
}
