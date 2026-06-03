import type { Click } from "@prisma/client";
import { logger } from "../config/logger";
import { getStringQueryParam, parseClickQueryParams } from "../utils/click-query-params";
import { keitaroService } from "./keitaro.service";
import { googleEventsService } from "./google-events.service";
import { tikTokEventsService } from "./tiktok-events.service";

type ClickForConversion = Pick<Click, "id" | "queryParams" | "ip" | "userAgent">;

class ClickConversionService {
  public async sendLeadConversions(click: ClickForConversion) {
    const queryParams = parseClickQueryParams(click.queryParams);

    if (!queryParams) {
      return;
    }

    const subid = getStringQueryParam(queryParams, "subid");
    const ttpixelid = getStringQueryParam(queryParams, "ttpixelid");
    const ttclid = getStringQueryParam(queryParams, "ttclid");
    const _ttp = getStringQueryParam(queryParams, "_ttp");
    const gapixelid = getStringQueryParam(queryParams, "gapixelid");
    const gclid = getStringQueryParam(queryParams, "gclid");
    const _ga = getStringQueryParam(queryParams, "_ga");

    if (!subid && !(ttpixelid && ttclid) && !(gapixelid && gclid)) {
      return;
    }

    logger.info(
      { clickId: click.id, subid, ttpixelid, ttclid, gapixelid, gclid },
      "Sending click lead conversions"
    );

    const tasks: Promise<unknown>[] = [];

    if (subid) {
      tasks.push(keitaroService.sendLeadPostback(subid, "lead"));
    }

    if (ttpixelid && ttclid) {
      tasks.push(
        tikTokEventsService.sendLeadEvent({
          clickId: click.id,
          pixelId: ttpixelid,
          ttclid,
          _ttp,
          ip: click.ip,
          userAgent: click.userAgent
        })
      );
    }

    if (gapixelid && gclid) {
      tasks.push(
        googleEventsService.sendLeadEvent({
          clickId: click.id,
          pixelId: gapixelid,
          gclid,
          _ga,
          ip: click.ip,
          userAgent: click.userAgent
        })
      );
    }

    await Promise.all(tasks);
  }
}

export const clickConversionService = new ClickConversionService();
