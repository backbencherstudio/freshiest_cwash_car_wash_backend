import { Controller, Get, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Notification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get user notifications' })
  @Get()
  async getUserNotifications(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('read') read?: string,
  ) {
    const userId = req.user.userId;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const isRead = read === 'true' ? true : read === 'false' ? false : undefined;

    return this.notificationService.getUserNotifications(userId, pageNum, limitNum, isRead);
  }

  @ApiOperation({ summary: 'Get unread notifications count' })
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const userId = req.user.userId;
    return this.notificationService.getUnreadCount(userId);
  }

  @ApiOperation({ summary: 'Mark notification as read' })
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user.userId;
    return this.notificationService.markAsRead(id, userId);
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Patch('read-all')
  async markAllAsRead(@Req() req: Request) {
    const userId = req.user.userId;
    return this.notificationService.markAllAsRead(userId);
  }

  @ApiOperation({ summary: 'Get single notification' })
  @Get(':id')
  async getNotification(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user.userId;
    return this.notificationService.getNotification(id, userId);
  }
}

