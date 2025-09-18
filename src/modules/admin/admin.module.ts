import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { ContactModule } from './contact/contact.module';
import { WebsiteInfoModule } from './website-info/website-info.module';
import { PaymentTransactionModule } from './payment-transaction/payment-transaction.module';
import { UserModule } from './user/user.module';
import { UserManagementModule } from './user-management/user-management.module';
import { NotificationModule } from './notification/notification.module';
import { VoucherModule } from './voucher/voucher.module';
import { BookingModule } from './booking/booking.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaymentsAndWithdrawsModule } from './payments-and-withdraws/payments-and-withdraws.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ShopManagementModule } from './shop-management/shop-management.module';
import { SettingModule } from './setting/setting.module';
import { ReportsExportModule } from './reports-export/reports-export.module';

@Module({
  imports: [
    FaqModule,
    ContactModule,
    WebsiteInfoModule,
    PaymentTransactionModule,
    UserModule,
    UserManagementModule,
    NotificationModule,
    VoucherModule,
    BookingModule,
    DashboardModule,
    PaymentsAndWithdrawsModule,
    ReviewsModule,
    ShopManagementModule,
    SettingModule,
    ReportsExportModule,
  ],
})
export class AdminModule { }
