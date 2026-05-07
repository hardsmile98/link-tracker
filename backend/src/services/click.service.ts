import { customAlphabet } from "nanoid";
import { prisma } from "../config/prisma";


type CreateClickInput = {
  referrer: string;
  userAgent: string | null;
  ip: string | null;
  queryParams: Record<string, string | string[]>;
};

const formatReferrer = (referrer: string): string | null => {
  try {
    const url = new URL(referrer);

    return `${url.origin}${url.pathname}`;
  } catch (error) {
    return null;
  }
};

export class ClickService {
  public async createClick(input: CreateClickInput) {

    const formattedReferrer = formatReferrer(input.referrer);

    const click = await prisma.click.create({
      data: {
        referrer: formattedReferrer,
        userAgent: input.userAgent,
        ip: input.ip,
        queryParams: input.queryParams
      }
    });

    return click;
  }
}
