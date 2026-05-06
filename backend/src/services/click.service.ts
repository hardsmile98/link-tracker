import { customAlphabet } from "nanoid";
import { prisma } from "../config/prisma";


type CreateClickInput = {
  referrer: string | null;
  userAgent: string | null;
  ip: string | null;
  queryParams: Record<string, string | string[]>;
};

export class ClickService {
  public async createClick(input: CreateClickInput) {

    const click = await prisma.click.create({
      data: {
        referrer: input.referrer,
        userAgent: input.userAgent,
        ip: input.ip,
        queryParams: input.queryParams
      }
    });

    return click;
  }
}
