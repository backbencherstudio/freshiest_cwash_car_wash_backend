import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    isRead?: boolean,
  ) {
    try {
      const skip = (page - 1) * limit;

      const where: any = {
        receiver_id: userId,
        deleted_at: null,
      };

      if (isRead !== undefined) {
        if (isRead) {
          where.read_at = { not: null };
        } else {
          where.read_at = null;
        }
      }

      const [notifications, total] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          select: {
            id: true,
            created_at: true,
            read_at: true,
            status: true,
            entity_id: true,
            sender: {
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
          skip,
          take: limit,
        }),
        this.prisma.notification.count({ where }),
      ]);

      // Transform notifications
      const transformedNotifications = notifications.map((notification) => {
        const notificationData: any = {
          id: notification.id,
          title: notification.notification_event?.type || 'Notification',
          message: notification.notification_event?.text || '',
          type: notification.notification_event?.type || 'system',
          is_read: notification.read_at !== null,
          read_at: notification.read_at,
          created_at: notification.created_at,
          entity_id: notification.entity_id,
          sender: notification.sender
            ? {
                id: notification.sender.id,
                name: notification.sender.name,
                email: notification.sender.email,
                avatar: notification.sender.avatar
                  ? SojebStorage.url(
                      appConfig().storageUrl.avatar + notification.sender.avatar,
                    )
                  : null,
              }
            : null,
        };

        return notificationData;
      });

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'Notifications retrieved successfully',
        data: transformedNotifications,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching notifications: ${error.message}`,
      };
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const count = await this.prisma.notification.count({
        where: {
          receiver_id: userId,
          read_at: null,
          deleted_at: null,
        },
      });

      return {
        success: true,
        data: {
          unread_count: count,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching unread count: ${error.message}`,
      };
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      // Verify notification belongs to user
      const notification = await this.prisma.notification.findFirst({
        where: {
          id: notificationId,
          receiver_id: userId,
        },
      });

      if (!notification) {
        return {
          success: false,
          message: 'Notification not found or access denied',
        };
      }

      if (notification.read_at) {
        return {
          success: true,
          message: 'Notification already marked as read',
        };
      }

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          read_at: new Date(),
        },
      });

      return {
        success: true,
        message: 'Notification marked as read',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error marking notification as read: ${error.message}`,
      };
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const result = await this.prisma.notification.updateMany({
        where: {
          receiver_id: userId,
          read_at: null,
          deleted_at: null,
        },
        data: {
          read_at: new Date(),
        },
      });

      return {
        success: true,
        message: `${result.count} notifications marked as read`,
        data: {
          updated_count: result.count,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error marking notifications as read: ${error.message}`,
      };
    }
  }

  async getNotification(notificationId: string, userId: string) {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: {
          id: notificationId,
          receiver_id: userId,
          deleted_at: null,
        },
        select: {
          id: true,
          created_at: true,
          read_at: true,
          status: true,
          entity_id: true,
          sender: {
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
      });

      if (!notification) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      const notificationData = {
        id: notification.id,
        title: notification.notification_event?.type || 'Notification',
        message: notification.notification_event?.text || '',
        type: notification.notification_event?.type || 'system',
        is_read: notification.read_at !== null,
        read_at: notification.read_at,
        created_at: notification.created_at,
        entity_id: notification.entity_id,
        sender: notification.sender
          ? {
              id: notification.sender.id,
              name: notification.sender.name,
              email: notification.sender.email,
              avatar: notification.sender.avatar
                ? SojebStorage.url(
                    appConfig().storageUrl.avatar + notification.sender.avatar,
                  )
                : null,
            }
          : null,
      };

      return {
        success: true,
        message: 'Notification retrieved successfully',
        data: notificationData,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching notification: ${error.message}`,
      };
    }
  }
}
