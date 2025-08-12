import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { VoucherService } from '../voucher/voucher.service';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.WASHER, Role.USER)
@Controller('booking')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly voucherService: VoucherService,
  ) { }

  @Post()
  create(@Body() createBookingDto: CreateBookingDto, @Req() req: any) {
    const user_id = req.user?.userId;
    return this.bookingService.create(createBookingDto, user_id);
  }

  @Get()
  findAll(
    @Query('search') searchQuery: string | null,
    @Query('status') status: string | null,
    @Query('startDate') startDate: string | null,
    @Query('endDate') endDate: string | null,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;

    // If status is provided, get bookings by status
    if (status) {
      return this.bookingService.getBookingsByStatus(status, userId);
    }

    // If date range is provided, get bookings by date range
    if (startDate && endDate) {
      return this.bookingService.getBookingsByDateRange(startDate, endDate, userId);
    }

    // Default: get all bookings
    return this.bookingService.findAll(searchQuery, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.bookingService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.bookingService.update(id, updateBookingDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.bookingService.remove(id, userId);
  }
}
