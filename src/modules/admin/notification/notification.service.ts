import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { UserRepository } from 'src/common/repository/user/user.repository';
import { Role } from 'src/common/guard/role/role.enum';
import { SendNotificationDto, NotificationRecipient, NotificationType } from './dto/send-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async getTodaysNotifications() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const notifications = await this.prisma.notification.findMany({
        where: {
          created_at: {
            gte: today,
            lt: tomorrow,
          },
        },
        select: {
          id: true,
          created_at: true,
          read_at: true,
          status: true,
          sender_id: true,
          receiver_id: true,
          entity_id: true,
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          notification_event: {
            select: {
              id: true,
              type: true,
              text: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 10, // Limit to recent notifications
      });

      // Transform data to match UI requirements
      const transformedNotifications = notifications.map(notification => {
        const eventType = notification.notification_event?.type || 'system';
        
        // Parse the type to extract notification type and recipient type
        let type = 'system';
        let recipientType = 'all_users';
        
        if (eventType.includes('_all_users')) {
          type = eventType.replace('_all_users', '');
          recipientType = 'all_users';
        } else if (eventType.includes('_all_washers')) {
          type = eventType.replace('_all_washers', '');
          recipientType = 'all_washers';
        } else {
          type = eventType;
        }
        
        return {
          id: notification.id,
          title: notification.notification_event?.type || 'System Notification',
          message: notification.notification_event?.text || 'No message',
          type: type,
          recipient_type: recipientType,
          created_at: notification.created_at,
          status: notification.status === 1 ? 'sent' : 'pending',
          sender: notification.sender,
          receiver: notification.receiver,
        };
      });

      return {
        success: true,
        data: transformedNotifications,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async sendNotification(sendNotificationDto: SendNotificationDto, senderId: string) {
    try {
      const { sendTo, title, message, type } = sendNotificationDto;

      // First, create the notification event with recipient type in the text
      const notificationEvent = await this.prisma.notificationEvent.create({
        data: {
          type: `${type}_${sendTo}`, // e.g., "broadcast_all_users" or "broadcast_all_washers"
          text: message,
          status: 1,
        },
      });
      
      // Get target users based on recipient type
      let whereCondition = { deleted_at: null, status: 1 };
      
      if (sendTo === NotificationRecipient.ALL_WASHERS) {
        whereCondition['OR'] = [
          { roles: { some: { name: 'washer' } } },
          { type: 'vendor' },
          { car_wash_station: { some: {} } },
        ];
      }

      const users = await this.prisma.user.findMany({
        where: whereCondition,
        select: { id: true },
      });

      // Create notification records for each user
      const notifications = users.map(user => ({
        sender_id: senderId,
        receiver_id: user.id,
        notification_event_id: notificationEvent.id,
        status: 1,
        created_at: new Date(),
      }));

      if (notifications.length > 0) {
        await this.prisma.notification.createMany({
          data: notifications,
        });
      }

      return {
        success: true,
        message: 'Notification sent successfully',
        data: {
          id: notificationEvent.id,
          title: title,
          message: message,
          type: type,
          recipient_type: sendTo,
          status: 'sent',
          created_at: new Date(),
          recipients_count: users.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async deleteNotification(id: string) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      // Delete the notification
      await this.prisma.notification.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
