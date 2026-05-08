import { env } from '../config/env';
import { logger } from '../config/logger';

class KeitaroService {
  public async sendLeadPostback(subid: string, status: 'lead' | 'deposit') {
    const postbackBaseUrl = env.KEITARO_POSTBACK_URL ?? null;

    if (!postbackBaseUrl) {
      return;
    }

    try {
      const postbackUrl = new URL(postbackBaseUrl);
      postbackUrl.searchParams.set('subid', subid);
      postbackUrl.searchParams.set('status', status);

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
