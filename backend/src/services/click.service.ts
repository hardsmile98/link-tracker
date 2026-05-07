import { prisma } from "../config/prisma";


type CreateClickInput = {
  userAgent: string | null;
  ip: string | null;
  queryParams: Record<string, string | string[]>;
};

export class ClickService {
  public async createClick(input: CreateClickInput) {

    const referrer = input.queryParams.referrer;

    const click = await prisma.click.create({
      data: {
        referrer,
        userAgent: input.userAgent,
        ip: input.ip,
        queryParams: input.queryParams
      }
    });

    return click;
  }
}
