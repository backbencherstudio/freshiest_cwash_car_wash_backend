import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export enum NotificationRecipient {
  ALL_USERS = 'all_users',
  ALL_WASHERS = 'all_washers'
}

export enum NotificationType {
  BROADCAST = 'broadcast',
  MESSAGE_PROVIDERS = 'message_providers',
  SCHEDULE_MESSAGE = 'schedule_message'
}

export class SendNotificationDto {
  @ApiProperty({
    description: 'Recipient type', 
    enum: NotificationRecipient,
    example: NotificationRecipient.ALL_USERS
  })
  @IsEnum(NotificationRecipient)
  sendTo: NotificationRecipient;

  @ApiProperty({ 
    description: 'Notification title', 
    example: 'System Maintenance Notice'
  })
  @IsString()
  title: string;

  @ApiProperty({ 
    description: 'Notification message', 
    example: 'Platform will be under maintenance tomorrow from 2-4 AM PST.'
  })
  @IsString()
  message: string;

  @ApiProperty({ 
    description: 'Notification type', 
    enum: NotificationType,
    example: NotificationType.BROADCAST
  })
  @IsEnum(NotificationType)
  type: NotificationType;
}
