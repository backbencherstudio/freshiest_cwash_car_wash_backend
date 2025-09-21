import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  /**
   * Get comprehensive dashboard data
   * Returns both car wash stats and income analytics
   */
  @Get()
  async getDashboardData(@Query('period') period?: string) {
    return this.dashboardService.getDashboardData(period || 'monthly');
  }

  /**
   * Get car wash statistics for the bar chart
   * Returns data for different revenue ranges (10k, 20k, 30k, etc.)
   */
  @Get('car-wash-stats')
  async getCarWashStats() {
    return this.dashboardService.getCarWashStats();
  }

  /**
   * Get income analytics for the donut chart
   * Returns data for different income sources and month-to-month comparison
   */
  @Get('income-analytics')
  async getIncomeAnalytics(@Query('period') period?: string) {
    return this.dashboardService.getIncomeAnalytics();
  }

  /**
   * Get real-time dashboard updates
   * For live data that updates frequently
   */
  @Get('real-time-stats')
  async getRealTimeStats() {
    return this.dashboardService.getRealTimeStats();
  }

}
