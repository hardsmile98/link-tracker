import { env } from '../config/env';
import { logger } from '../config/logger';

class KeitaroService {
  public async sendLeadPostback(subid: string, status: 'lead' | 'deposit', value?: number) {
    const postbackBaseUrl = env.KEITARO_POSTBACK_URL ?? null;

    if (!postbackBaseUrl) {
      logger.warn({ subid, status, value }, 'Keitaro postback URL not found');

      return;
    }

    try {
      const postbackUrl = new URL(postbackBaseUrl);
      postbackUrl.searchParams.set('subid', subid);
      postbackUrl.searchParams.set('status', status);

      if (value) {
        postbackUrl.searchParams.set('payout', value.toString());
      }

      const response = await fetch(postbackUrl.toString(), {
        method: 'GET',
      });

      if (!response.ok) {
        logger.warn(
          {
            status: response.status,
            statusText: response.statusText,
          },
          'Keitaro postback returned non-OK status',
        );
      }
    } catch (error) {
      logger.warn({ err: error }, 'Failed to send Keitaro lead postback');
    }
  }
}

export const keitaroService = new KeitaroService();
