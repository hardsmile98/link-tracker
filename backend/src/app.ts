import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import { adminAuthRouter } from "./routes/admin-auth.routes";
import { attributionRouter } from "./routes/attribution.routes";
import { clickRouter } from "./routes/click.routes";
import { redirectRuleRouter } from "./routes/redirect-rule.routes";

export const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" 
      ? true 
      : env.CORS_ORIGIN.split(",").map((item) => item.trim()),
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(clickRouter);
app.use(attributionRouter);
app.use(adminAuthRouter);
app.use(redirectRuleRouter);

app.use(errorHandler);
