import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger";
import { AppError } from "../utils/app-error";

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: error.flatten()
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, requestId: req.id }, error.message);
    } else {
      logger.warn({ err: error, requestId: req.id }, error.message);
    }

    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      details: error.details
    });
    return;
  }

  logger.error({ err: error, requestId: req.id }, "Unhandled error");
  res.status(500).json({
    success: false,
    error: "Internal server error"
  });
}
