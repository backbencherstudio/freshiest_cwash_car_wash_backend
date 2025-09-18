import { Controller, Get, Post, Body, Query, UseGuards, ValidationPipe, UsePipes } from '@nestjs/common';
import { ReportsExportService } from './reports-export.service';
import { FilterReportsDto } from './dto/filter-reports.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiBearerAuth()
@ApiTags('Reports & Analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/reports')
export class ReportsExportController {
  constructor(private readonly reportsExportService: ReportsExportService) {}

  @ApiOperation({ summary: 'Get filtered reports with date range and filters' })
  @ApiResponse({ status: 200, description: 'Filtered reports retrieved successfully' })
  @Get('filter')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getFilteredReports(@Query() filterDto: FilterReportsDto) {
    return this.reportsExportService.getFilteredReports(filterDto);
  }

  @ApiOperation({ summary: 'Get booking management data with tabs' })
  @ApiResponse({ status: 200, description: 'Booking management data retrieved successfully' })
  @ApiQuery({ name: 'tab', required: false, description: 'Booking status tab' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @Get('bookings')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getBookingManagement(@Query() queryDto: BookingQueryDto) {
    return this.reportsExportService.getBookingManagement(queryDto);
  }

  @ApiOperation({ summary: 'Get service provider earnings summary' })
  @ApiResponse({ status: 200, description: 'Service provider earnings summary retrieved successfully' })
  @Get('earnings/summary')
  async getServiceProviderEarningsSummary() {
    return this.reportsExportService.getServiceProviderEarningsSummary();
  }

  @ApiOperation({ summary: 'Get service provider earnings detailed view' })
  @ApiResponse({ status: 200, description: 'Service provider earnings detailed view retrieved successfully' })
  @Get('earnings/detailed')
  async getServiceProviderEarningsDetailed() {
    return this.reportsExportService.getServiceProviderEarningsDetailed();
  }

  @ApiOperation({ summary: 'Export bookings to CSV' })
  @ApiResponse({ status: 200, description: 'Bookings exported to CSV successfully' })
  @Post('export/bookings')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async exportBookingsCSV(@Body() filterDto: FilterReportsDto) {
    return this.reportsExportService.exportBookingsCSV(filterDto);
  }

  @ApiOperation({ summary: 'Export earnings to CSV' })
  @ApiResponse({ status: 200, description: 'Earnings exported to CSV successfully' })
  @Post('export/earnings')
  async exportEarningsCSV() {
    return this.reportsExportService.exportEarningsCSV();
  }
}
