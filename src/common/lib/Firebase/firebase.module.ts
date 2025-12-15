import { Global, Module } from '@nestjs/common';
import { FirebaseAdminProvider } from './firebase-admin.provider';
import { PushNotificationService } from './push-notification.service';

@Global()
@Module({
  providers: [FirebaseAdminProvider, PushNotificationService],
  exports: [PushNotificationService],
})
export class FirebaseModule {}

