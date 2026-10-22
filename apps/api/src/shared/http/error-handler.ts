import type { ErrorCode, ErrorResponse } from "@car-rental/contracts";
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from "fastify-type-provider-zod";
import { AppError } from "../errors/app-error.ts";
import { isDatabaseUnavailable, isTransientConflict } from "../db/pg-errors.ts";

function send(reply: FastifyReply, request: FastifyRequest, status: number, code: ErrorCode, message: string, details?: unknown) {
  const body: ErrorResponse = { error: { code, message, requestId: request.id, ...(details !== undefined && { details }) } };
  return reply.status(status).send(body);
}

/**
 * Single place that turns errors into the `{ error: { code, message } }` envelope.
 * Expected errors keep their message; anything unexpected becomes a generic 500 and is logged.
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | AppError | Error, request, reply) => {
    if (error instanceof AppError) {
      return send(reply, request, error.statusCode, error.code, error.message, error.details);
    }
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((issue) => ({
        path: [error.validationContext, ...issue.instancePath.split("/").filter(Boolean)].join("."),
        message: issue.message,
      }));
      return send(reply, request, 400, "VALIDATION_ERROR", "Some fields are invalid", details);
    }
    if (isResponseSerializationError(error)) {
      request.log.error({ err: error }, "Response did not match its schema");
      return send(reply, request, 500, "INTERNAL_ERROR", "Something went wrong");
    }
    if (isTransientConflict(error)) {
      request.log.warn({ err: error }, "Transient database conflict");
      reply.header("retry-after", "1");
      return send(reply, request, 503, "SERVICE_UNAVAILABLE", "The server was busy, please retry");
    }
    if (isDatabaseUnavailable(error)) {
      request.log.error({ err: error }, "Database unavailable");
      return send(reply, request, 503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable, please retry");
    }

    const statusCode = "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
    if (statusCode === 429) {
      return send(reply, request, 429, "RATE_LIMITED", "Too many requests, please slow down");
    }
    if (statusCode === 413) {
      return send(reply, request, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
    }
    if (statusCode >= 400 && statusCode < 500) {
      // Framework-level client errors: malformed JSON, unsupported media type, etc.
      return send(reply, request, statusCode, "VALIDATION_ERROR", error.message);
    }

    request.log.error({ err: error }, "Unhandled error");
    return send(reply, request, 500, "INTERNAL_ERROR", "Something went wrong");
  });

  app.setNotFoundHandler((request, reply) => send(reply, request, 404, "NOT_FOUND", "Route not found"));
}
