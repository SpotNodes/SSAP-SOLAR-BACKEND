import { env } from '../../config/env.js';
import { logger } from '../../core/logger/logger.js';
import { toE164India } from '../../core/validation/mobile.js';
import type { EmailSender } from '../../providers/email/email-sender.js';
import type { NotificationRepository } from '../notifications/notification.repository.js';
import type { CreateEnquiryData, EnquiryEntity, EnquiryRepository } from './enquiry.repository.js';
import type { CreateEnquiryBody } from './enquiry.schema.js';

export class EnquiryService {
  constructor(
    private readonly enquiries: EnquiryRepository,
    private readonly notifications: NotificationRepository,
    private readonly emailSender: EmailSender,
  ) {}

  async submit(input: CreateEnquiryBody): Promise<EnquiryEntity> {
    const data: CreateEnquiryData = { ...input, mobile: toE164India(input.mobile) };
    const enquiry = await this.enquiries.create(data);

    // Fire-and-forget, same as order notifications (PRD §10: never block the request path).
    void this.notifyAdmin(enquiry).catch((err: unknown) => {
      logger.error({ err, enquiryId: enquiry.id }, 'Failed to dispatch enquiry notification');
    });

    return enquiry;
  }

  private async notifyAdmin(enquiry: EnquiryEntity): Promise<void> {
    const title = `New enquiry from ${enquiry.name}`;
    await this.notifications.create({
      type: 'ENQUIRY_RECEIVED',
      title,
      body: enquiry.message,
      data: { enquiryId: enquiry.id },
    });

    const to = env.ADMIN_NOTIFICATION_EMAIL ?? env.ADMIN_BOOTSTRAP_EMAIL;
    if (!to) return;
    await this.emailSender.send({ to, subject: title, body: enquiry.message });
  }
}
