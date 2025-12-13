import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushNotificationService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App | null,
  ) {}

  /**
   * Send push notification to a single device
   */
  async sendToDevice(
    fcmToken: string,
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.firebaseApp) {
      console.warn('Firebase not configured. Skipping push notification.');
      return { success: false, error: 'Firebase not configured' };
    }

    if (!fcmToken) {
      return { success: false, error: 'No FCM token provided' };
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.firebaseApp.messaging().send(message);
      console.log('Push notification sent:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending push notification:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToMultipleDevices(
    fcmTokens: string[],
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; successCount: number; failureCount: number }> {
    if (!this.firebaseApp) {
      console.warn('Firebase not configured. Skipping push notifications.');
      return { success: false, successCount: 0, failureCount: fcmTokens.length };
    }

    const validTokens = fcmTokens.filter((token) => token);
    if (validTokens.length === 0) {
      return { success: false, successCount: 0, failureCount: 0 };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.firebaseApp.messaging().sendEachForMulticast(message);
      console.log(
        `Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`,
      );
      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error('Error sending push notifications:', error.message);
      return { success: false, successCount: 0, failureCount: validTokens.length };
    }
  }

  /**
   * Send booking notification to washer
   */
  async notifyNewBooking(
    washerFcmToken: string,
    userName: string,
    serviceName: string,
    bookingId: string,
  ) {
    return this.sendToDevice(washerFcmToken, {
      title: 'New Booking! 🚗',
      body: `${userName} booked ${serviceName}`,
      data: {
        type: 'new_booking',
        bookingId,
      },
    });
  }

  /**
   * Send booking status update to user
   */
  async notifyBookingStatusChange(
    userFcmToken: string,
    status: string,
    bookingId: string,
  ) {
    const statusMessages: Record<string, { title: string; body: string }> = {
      confirmed: {
        title: 'Booking Confirmed ✅',
        body: 'Your booking has been confirmed!',
      },
      in_progress: {
        title: 'Wash Started 🚿',
        body: 'Your car wash has started!',
      },
      completed: {
        title: 'Wash Complete! ✨',
        body: 'Your car wash is complete. Thank you!',
      },
      cancelled: {
        title: 'Booking Cancelled ❌',
        body: 'Your booking has been cancelled.',
      },
      rejected: {
        title: 'Booking Rejected',
        body: 'Sorry, your booking was rejected.',
      },
    };

    const message = statusMessages[status] || {
      title: 'Booking Update',
      body: `Your booking status: ${status}`,
    };

    return this.sendToDevice(userFcmToken, {
      ...message,
      data: {
        type: 'booking_status',
        bookingId,
        status,
      },
    });
  }
}

