import { env } from './config/env.js';
import { MongoRefreshTokenRepository } from './core/auth/refresh-token.repository.js';
import { TokenService } from './core/auth/token.service.js';
import { MongoAdminRepository } from './modules/admin/admin.repository.js';
import { AdminAuthService } from './modules/admin/admin-auth.service.js';
import { AdminCategoryService } from './modules/admin/admin-category.service.js';
import { AdminEnquiryService } from './modules/admin/admin-enquiry.service.js';
import { AdminNotificationService } from './modules/admin/admin-notification.service.js';
import { AdminOrderService } from './modules/admin/admin-order.service.js';
import { AdminProductService } from './modules/admin/admin-product.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import { MongoCategoryRepository } from './modules/catalog/category.repository.js';
import { CategoryService } from './modules/catalog/category.service.js';
import { MongoProductRepository } from './modules/catalog/product.repository.js';
import { ProductService } from './modules/catalog/product.service.js';
import { MongoOtpRepository } from './modules/auth/otp.repository.js';
import { MongoVerificationTokenRepository } from './modules/auth/verification-token.repository.js';
import { MongoEnquiryRepository } from './modules/enquiries/enquiry.repository.js';
import { EnquiryService } from './modules/enquiries/enquiry.service.js';
import { MongoDeviceRepository } from './modules/notifications/device.repository.js';
import { DeviceService } from './modules/notifications/device.service.js';
import { MongoNotificationRepository } from './modules/notifications/notification.repository.js';
import { NotificationOrderEventPublisher } from './modules/notifications/order-notification-publisher.js';
import { MongoOrderRepository } from './modules/orders/order.repository.js';
import { OrderService } from './modules/orders/order.service.js';
import { MongoUserRepository } from './modules/users/user.repository.js';
import { UserService } from './modules/users/user.service.js';
import { DevEmailSender } from './providers/email/dev-email-sender.js';
import type { EmailSender } from './providers/email/email-sender.js';
import { DevOtpSender } from './providers/otp/dev-otp-sender.js';
import type { OtpSender } from './providers/otp/otp-sender.js';
import { DevPushSender } from './providers/push/dev-push-sender.js';
import { ExpoPushSender } from './providers/push/expo-push-sender.js';
import type { PushSender } from './providers/push/push-sender.js';

function createOtpSender(): OtpSender {
  switch (env.OTP_PROVIDER) {
    case 'dev':
      return new DevOtpSender();
    default:
      throw new Error(`OTP provider "${env.OTP_PROVIDER}" is not implemented yet.`);
  }
}

function createPushSender(): PushSender {
  switch (env.PUSH_PROVIDER) {
    case 'dev':
      return new DevPushSender();
    case 'expo':
      return new ExpoPushSender();
    default:
      throw new Error(`Push provider "${env.PUSH_PROVIDER}" is not implemented yet.`);
  }
}

function createEmailSender(): EmailSender {
  switch (env.EMAIL_PROVIDER) {
    case 'dev':
      return new DevEmailSender();
    default:
      throw new Error(`Email provider "${env.EMAIL_PROVIDER}" is not implemented yet.`);
  }
}

const refreshTokenRepository = new MongoRefreshTokenRepository();
const tokenService = new TokenService(refreshTokenRepository);

const userRepository = new MongoUserRepository();
const otpRepository = new MongoOtpRepository();
const verificationTokenRepository = new MongoVerificationTokenRepository();
const otpSender = createOtpSender();

const adminRepository = new MongoAdminRepository();

const categoryRepository = new MongoCategoryRepository();
const productRepository = new MongoProductRepository();

const orderRepository = new MongoOrderRepository();

const deviceRepository = new MongoDeviceRepository();
const notificationRepository = new MongoNotificationRepository();
const enquiryRepository = new MongoEnquiryRepository();
const pushSender = createPushSender();
const emailSender = createEmailSender();
const orderEventPublisher = new NotificationOrderEventPublisher(
  deviceRepository,
  pushSender,
  notificationRepository,
  emailSender,
);

const categoryService = new CategoryService(categoryRepository);

export const container = {
  tokenService,
  userService: new UserService(userRepository),
  authService: new AuthService(userRepository, otpRepository, verificationTokenRepository, otpSender, tokenService),
  adminAuthService: new AdminAuthService(adminRepository, tokenService),
  adminRepository,
  categoryService,
  productService: new ProductService(productRepository),
  orderService: new OrderService(orderRepository, productRepository, userRepository, orderEventPublisher),
  adminOrderService: new AdminOrderService(orderRepository, productRepository, orderEventPublisher),
  adminProductService: new AdminProductService(productRepository),
  adminCategoryService: new AdminCategoryService(categoryRepository, categoryService),
  deviceService: new DeviceService(deviceRepository),
  adminNotificationService: new AdminNotificationService(notificationRepository),
  enquiryService: new EnquiryService(enquiryRepository, notificationRepository, emailSender),
  adminEnquiryService: new AdminEnquiryService(enquiryRepository),
};
