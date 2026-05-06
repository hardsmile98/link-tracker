import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { logger } from "../config/logger";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const requestId = req.headers["x-request-id"]?.toString() ?? randomUUID();
    res.setHeader("x-request-id", requestId);
    return requestId;
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage(req, res, error) {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${error.message}`;
  }
});
