import { Controller, Get, Post, Param, Delete, UseGuards, Req, Body, ValidationPipe, UsePipes } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Notification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get today\'s notifications' })
  @ApiResponse({ status: 200, description: 'Today\'s notifications retrieved successfully' })
  @Get('today')
  async getTodaysNotifications() {
    return this.notificationService.getTodaysNotifications();
  }

  @ApiOperation({ summary: 'Send notification to users' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Post('send')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async sendNotification(@Body() sendNotificationDto: SendNotificationDto, @Req() req: Request) {
    // console.log(sendNotificationDto);
    const senderId = req.user.userId;
    return this.notificationService.sendNotification(sendNotificationDto, senderId);
  }

  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @Delete(':id')
  async deleteNotification(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }
}
