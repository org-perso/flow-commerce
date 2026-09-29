import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

/** RFC 7807 problem details. */
export class ProblemError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(detail ?? title);
  }
}

export const notFound: RequestHandler = (req) => {
  throw new ProblemError(404, 'Not Found', `No route for ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let problem: ProblemError;
  if (err instanceof ProblemError) {
    problem = err;
  } else if (err instanceof ZodError) {
    problem = new ProblemError(400, 'Validation Failed', 'The request is invalid.', {
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  } else if (err?.type === 'entity.parse.failed') {
    problem = new ProblemError(400, 'Bad Request', 'Malformed JSON body.');
  } else {
    console.error(err);
    problem = new ProblemError(500, 'Internal Server Error');
  }

  res
    .status(problem.status)
    .type('application/problem+json')
    .json({
      type: 'about:blank',
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      instance: req.originalUrl,
      ...problem.extra,
    });
};
