import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async subscribe(email: string, userId?: string) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email } });

    if (existing) {
      if (existing.unsubscribedAt) {
        // Re-subscribe
        const updated = await this.prisma.newsletterSubscriber.update({
          where: { email },
          data: { unsubscribedAt: null, userId: userId ?? existing.userId },
        });
        return updated;
      }
      return existing;
    }

    const subscriber = await this.prisma.newsletterSubscriber.create({
      data: { email, ...(userId ? { userId } : {}) },
    });

    // Resolve user name for welcome email
    let name = 'there';
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) name = user.name;
    }

    void this.mail.sendNewsletterWelcome(email, name, subscriber.unsubscribeToken);
    return subscriber;
  }

  async unsubscribe(token: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
    });
    if (!subscriber || subscriber.unsubscribedAt) return;

    await this.prisma.newsletterSubscriber.update({
      where: { unsubscribeToken: token },
      data: { unsubscribedAt: new Date() },
    });
  }

  async getStatus(userId: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { userId },
    });
    return { subscribed: !!subscriber && !subscriber.unsubscribedAt };
  }

  async unsubscribeByUserId(userId: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { userId },
    });
    if (!subscriber || subscriber.unsubscribedAt) return;
    await this.prisma.newsletterSubscriber.update({
      where: { userId },
      data: { unsubscribedAt: new Date() },
    });
  }

  async blastFeatureAnnouncement(title: string, description: string) {
    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: { unsubscribedAt: null },
      include: { user: true },
    });

    const sends = subscribers.map((sub) =>
      this.mail.sendFeatureAnnouncement(
        sub.email,
        sub.user?.name ?? 'there',
        title,
        description,
        sub.unsubscribeToken,
      ),
    );

    const results = await Promise.allSettled(sends);
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { sent: subscribers.length - failed, failed };
  }
}
