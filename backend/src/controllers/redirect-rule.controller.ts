import { Request, Response } from "express";
import { z } from "zod";
import { RedirectRuleService } from "../services/redirect-rule.service";

const redirectRuleService = new RedirectRuleService();

const createRuleSchema = z.object({
  name: z.string().trim().min(1),
  referrer: z.string().trim().min(1).nullable(),
  redirect_url: z.url()
});

const updateRuleSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    referrer: z.string().trim().min(1).nullable().optional(),
    redirect_url: z.url().optional()
  })
  .refine(
    (value) =>
      value.name !== undefined || value.referrer !== undefined || value.redirect_url !== undefined,
    {
      message: "At least one field is required"
    }
  );

const idParamsSchema = z.object({
  id: z.uuid()
});

export async function listRedirectRules(_req: Request, res: Response) {
  const rules = await redirectRuleService.listRules();

  res.json({
    success: true,
    data: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      referrer: rule.referrer,
      redirect_url: rule.redirectUrl,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt
    }))
  });
}

export async function createRedirectRule(req: Request, res: Response) {
  const payload = createRuleSchema.parse(req.body);

  const rule = await redirectRuleService.createRule({
    name: payload.name,
    referrer: payload.referrer,
    redirectUrl: payload.redirect_url
  });

  res.status(201).json({
    success: true,
    data: {
      id: rule.id,
      name: rule.name,
      referrer: rule.referrer,
      redirect_url: rule.redirectUrl,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt
    }
  });
}

export async function updateRedirectRule(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const payload = updateRuleSchema.parse(req.body);

  const input: { id: string; name?: string; referrer?: string | null; redirectUrl?: string } = { id };

  if (payload.name !== undefined) {
    input.name = payload.name;
  }

  if (payload.referrer !== undefined) {
    input.referrer = payload.referrer;
  }

  if (payload.redirect_url !== undefined) {
    input.redirectUrl = payload.redirect_url;
  }

  const rule = await redirectRuleService.updateRule(input);

  res.json({
    success: true,
    data: {
      id: rule.id,
      name: rule.name,
      referrer: rule.referrer,
      redirect_url: rule.redirectUrl,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt
    }
  });
}

export async function deleteRedirectRule(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);

  await redirectRuleService.deleteRule(id);

  res.status(204).send();
}
