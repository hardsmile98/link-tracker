import { logger } from '../config/logger';
import { prisma } from '../config/prisma';

class FacebookConversionsService {
  public async sendContactEvent(accountId: string, fbp: string) {
    const adAccount = await prisma.adAccount.findFirst({
      where: {
        platform: 'facebook',
        pixelId: fbp,
      },
      select: {
        accessKey: true,
        pixelId: true,
      },
    });

    if (!adAccount) {
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${adAccount.pixelId}/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: [
              {
                event_name: 'Contact',
                event_time: Math.floor(Date.now() / 1000),
                event_id: `${accountId}:${Date.now()}:contact`,
                action_source: 'website',
                user_data: {
                  fbp,
                },
              },
            ],
            access_token: adAccount.accessKey,
          }),
        },
      );

      if (!response.ok) {
        logger.warn(
          {
            status: response.status,
            statusText: response.statusText,
            fbp,
          },
          'Facebook Conversions API returned non-OK status',
        );
      }
    } catch (error) {
      logger.warn(
        { err: error, fbp },
        'Failed to send Facebook contact event',
      );
    }
  }
}

export const facebookConversionsService = new FacebookConversionsService();
