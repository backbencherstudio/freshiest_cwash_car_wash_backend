import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { PushNotificationService } from 'src/common/lib/Firebase';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

type FindOpts = {
  page?: number;
  pageSize?: number;
  role?: 'user' | 'washers';
  q?: string;
  status?: 'active' | 'suspended' | 'deleted';
};

@Injectable()
export class UserManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  // returns { total, page, pageSize, data: UserListItem[] }
  async findAll(opts: FindOpts) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;
    const skip = (page - 1) * pageSize;

    // build where as a conjunction of clauses
    const ands: any[] = [];

    // role filter: only type-based
    if (opts.role === 'washers') {
      ands.push({ type: 'washer' });
    } else if (opts.role === 'user') {
      ands.push({ type: 'user' });
    } else {
      // keep default behavior for 'all' tab (exclude deleted)
    }

    // status filter
    if (opts.status === 'suspended') {
      ands.push({ status: 0, deleted_at: null });
    } else if (opts.status === 'deleted') {
      ands.push({ deleted_at: { not: null } });
    } else if (opts.status === 'active') {
      ands.push({ status: 1, deleted_at: null });
    } else {
      ands.push({ deleted_at: null });
    }

    // search q -> name, email, phone_number
    if (opts.q) {
      ands.push({
        OR: [
          { name: { contains: opts.q, mode: 'insensitive' } },
          { email: { contains: opts.q, mode: 'insensitive' } },
          { phone_number: { contains: opts.q, mode: 'insensitive' } },
          { username: { contains: opts.q, mode: 'insensitive' } },
        ],
      });
    }

    const where = ands.length ? { AND: ands } : {};

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          first_name: true,
          last_name: true,
          email: true,
          email_verified_at: true,
          phone_number: true,
          avatar: true,
          created_at: true,
          status: true,
          deleted_at: true,
          type: true,
          car_wash_station: {
            select: {
              rating: true,
              reviewCount: true,
            },
          },
        },
      }),
    ]);

    const data = users.map((u) => {
      const displayName =
        u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown';
      const status =
        u.deleted_at ? 'deleted' : u.status === 0 ? 'suspended' : 'active';
      const isWasher = u.type === 'washer';
      const ratingLabel = isWasher && u.car_wash_station
        ? `${(u.car_wash_station.rating ?? 0).toFixed(1)} (${u.car_wash_station.reviewCount ?? 0} reviews)`
        : null;
      const verification = u.email_verified_at ? 'verified' : 'unverified';
      return {
        id: u.id,
        name: displayName,
        joinDate: u.created_at, // format client-side or server-side as needed
        phone: u.phone_number || '',
        email: u.email || '',
        avatar: u.avatar || null,
        status,
        verification: isWasher ? verification : null,
        rating: isWasher ? ratingLabel : null,
      };
    });

    return {
      success: true,
      message: 'Users fetched successfully',
      meta: { total, page, pageSize },
      data,
    };
  }

  async findById(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          status: true,
          approved_at: true,
          availability: true,
          email: true,
          username: true,
          name: true,
          first_name: true,
          last_name: true,
          domain: true,
          avatar: true,
          phone_number: true,
          country: true,
          state: true,
          city: true,
          address: true,
          zip_code: true,
          gender: true,
          date_of_birth: true,
          billing_id: true,
          type: true,
        },
      });
    if (!user) throw new NotFoundException('User not found');

    if (user.avatar) {
      user['avatar_url'] = SojebStorage.url(
        appConfig().storageUrl.avatar + user.avatar,
      );
    }
    return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }


  async suspend(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { status: 0 },
    });

    return { success: true, message: 'User suspended' };
  }

  async restore(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { deleted_at: null, status: 1 },
    });

    return { success: true, message: 'User restored' };
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // soft delete: set deleted_at
    await this.prisma.user.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { success: true, message: 'User deleted' };
  }

  async sendAdminAlert(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, fcm_token: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.fcm_token) {
      return {
        success: false,
        message: 'No FCM token found for this user',
      };
    }

    // store notification for inbox/history
    await NotificationRepository.createNotification({
      sender_id: null,
      receiver_id: user.id,
      text: payload.body,
      type: 'message',
      entity_id: null,
    });

    const res = await this.pushNotificationService.sendToDevice(user.fcm_token, {
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });

    return {
      success: res.success,
      message: res.success ? 'Notification sent' : res.error || 'Failed to send notification',
      messageId: res.messageId,
    };
  }
}
