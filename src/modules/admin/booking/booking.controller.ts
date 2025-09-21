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
@Roles(Role.ADMIN)
@Controller('dashboard/booking-management')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService
  ) { }

  @Get()
  findAll(
    @Req() req: any,
    @Query('search') searchQuery?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.bookingService.findAll({
      search: searchQuery,
      status,
      page: page || 1,
      limit: limit || 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Req() req: any,
  ) {
    return this.bookingService.update(id, updateBookingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.remove(id);
  }
}
