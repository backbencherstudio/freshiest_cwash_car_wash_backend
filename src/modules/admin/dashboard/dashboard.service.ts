import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get car wash statistics for the bar chart
   * Returns data for different revenue ranges (10k, 20k, 30k, etc.)
   */
  async getCarWashStats() {
    try {
      // Get total revenue from all completed bookings
      const totalRevenue = await this.prisma.booking.aggregate({
        where: {
          status: 'accept',
          payment_status: 'succeeded',
        },
        _sum: {
          total_amount: true,
        },
      });

      // Get revenue by car wash station
      const revenueByStation = await this.prisma.booking.groupBy({
        by: ['car_wash_station_id'],
        where: {
          status: 'accept',
          payment_status: 'succeeded',
        },
        _sum: {
          total_amount: true,
        },
        _count: {
          id: true,
        },
      });

      // Get revenue by service type
      const revenueByService = await this.prisma.booking.groupBy({
        by: ['service_id'],
        where: {
          status: 'accept',
          payment_status: 'succeeded',
        },
        _sum: {
          total_amount: true,
        },
        _count: {
          id: true,
        },
      });

      // Get monthly revenue for the last 8 months
      const monthlyRevenue = await this.prisma.booking.groupBy({
        by: ['created_at'],
        where: {
          status: 'accept',
          payment_status: 'succeeded',
          created_at: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 7)),
          },
        },
        _sum: {
          total_amount: true,
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      // Format data for the bar chart (10k, 20k, 30k, etc.)
      const revenueRanges = [
        { range: '10k', min: 0, max: 10000, color: 'blue' },
        { range: '20k', min: 10000, max: 20000, color: 'green' },
        { range: '30k', min: 20000, max: 30000, color: 'blue' },
        { range: '40k', min: 30000, max: 40000, color: 'green' },
        { range: '50k', min: 40000, max: 50000, color: 'blue' },
        { range: '60k', min: 50000, max: 60000, color: 'green' },
        { range: '70k', min: 60000, max: 70000, color: 'blue' },
        { range: '80k', min: 70000, max: 80000, color: 'green' },
      ];

      const chartData = revenueRanges.map((range) => {
        const count = revenueByStation.filter((station) => {
          const revenue = Number(station._sum.total_amount || 0);
          return revenue >= range.min && revenue < range.max;
        }).length;

        return {
          range: range.range,
          count,
          color: range.color,
          revenue: (count * (range.min + range.max)) / 2, // Average revenue for the range
        };
      });

            return {
                success: true,
                message: 'Car wash statistics retrieved successfully',
                data: {
                    totalRevenue: Number(totalRevenue._sum.total_amount || 0),
                    totalBookings: await this.prisma.booking.count({
                        where: { status: 'accept' },
                    }),
                    chartData,
                    revenueByStation: revenueByStation.map(station => ({
                        stationId: station.car_wash_station_id,
                        revenue: Number(station._sum.total_amount || 0),
                        bookings: station._count.id,
                    })),
                    revenueByService: revenueByService.map(service => ({
                        serviceId: service.service_id,
                        revenue: Number(service._sum.total_amount || 0),
                        bookings: service._count.id,
                    })),
                    monthlyRevenue: monthlyRevenue.map(month => ({
                        month: month.created_at,
                        revenue: Number(month._sum.total_amount || 0),
                    })),
                },
            };
        } catch (error) {
            return {
                success: false,
                message: `Error retrieving car wash statistics: ${error.message}`,
                data: null,
            };
        }
    }

  /**
   * Get income analytics for the donut chart
   * Returns data for different income sources and month-to-month comparison
   */
  async getIncomeAnalytics() {
    try {
      // Get income by source (GNote, Office, RCloud) for the current month
      const currentMonth = new Date();
      currentMonth.setDate(1); // Start from the first day of the current month
      const startOfMonth = new Date(currentMonth.setHours(0, 0, 0, 0)); // Starting at midnight
      const endOfMonth = new Date(
        currentMonth.setMonth(currentMonth.getMonth() + 1),
      ); // End of current month

            // Get income by source
            const incomeBySource = await this.prisma.booking.groupBy({
                by: ['service_id'],
                where: {
                    status: 'accept',
                    payment_status: 'succeeded',
                    created_at: {
                        gte: startOfMonth, // Only get bookings in the current month
                        lte: endOfMonth,
                    },
                },
                _sum: {
                    total_amount: true,
                },
                _count: {
                    id: true,
                },
            });

      // Calculate the total income for the current month
      const currentTotalIncome = incomeBySource.reduce(
        (sum, source) => sum + Number(source._sum.total_amount || 0),
        0,
      );

      // Calculate income distribution across categories (simulated in this case)
      const sourceCategories = {
        GNote: { color: 'green', revenue: 0, percentage: 0 },
        Office: { color: 'darkblue', revenue: 0, percentage: 0 },
        RCloud: { color: 'blue', revenue: 0, percentage: 0 },
      };

      if (incomeBySource.length > 0) {
        const totalRevenue = currentTotalIncome;

        // Simulate distribution across the sources
        sourceCategories['GNote'].revenue = totalRevenue * 0.35; // 35%
        sourceCategories['Office'].revenue = totalRevenue * 0.2; // 20%
        sourceCategories['RCloud'].revenue = totalRevenue * 0.45; // 45%

        // Calculate percentages for each category
        Object.keys(sourceCategories).forEach((key) => {
          sourceCategories[key].percentage =
            (sourceCategories[key].revenue / totalRevenue) * 100;
        });
      }

      return {
        success: true,
        message: 'Income analytics retrieved successfully',
        data: {
          totalIncome: currentTotalIncome,
          incomeBySource: Object.entries(sourceCategories).map(
            ([source, data]) => ({
              source,
              revenue: Math.round(data.revenue * 100) / 100,
              percentage: Math.round(data.percentage * 100) / 100,
              color: data.color,
            }),
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error retrieving income analytics: ${error.message}`,
        data: null,
      };
    }
  }

    /**
     * Get comprehensive dashboard data
     * Combines car wash stats and income analytics
     */
    async getDashboardData() {
        try {
            const [carWashStats, incomeAnalytics] = await Promise.all([
                this.getCarWashStats(),
                this.getIncomeAnalytics(),
            ]);

            return {
                success: true,
                message: 'Dashboard data retrieved successfully',
                data: {
                    carWash: carWashStats.data,
                    income: incomeAnalytics.data,
                    summary: {
                        totalRevenue: carWashStats.data?.totalRevenue || 0,
                        totalBookings: carWashStats.data?.totalBookings || 0,
                        totalIncome: incomeAnalytics.data?.totalIncome || 0,
                        //  percentageIncrease: incomeAnalytics.data?.totalIncome || 0,
                    },
                },
            };
        } catch (error) {
            return {
                success: false,
                message: `Error retrieving dashboard data: ${error.message}`,
                data: null,
            };
        }
    }

  /**
   * Get real-time dashboard updates
   * For live data that updates frequently
   */
  async getRealTimeStats() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            // Today's bookings
            const todayBookings = await this.prisma.booking.count({
                where: {
                    created_at: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
            });

            // Today's revenue
            const todayRevenue = await this.prisma.booking.aggregate({
                where: {
                    status: 'completed',
                    payment_status: 'completed',
                    created_at: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                _sum: {
                    total_amount: true,
                },
            });

      // Pending payments
      const pendingPayments = await this.prisma.booking.count({
        where: {
          payment_status: 'pending',
        },
      });

      // Active car wash stations
      const activeStations = await this.prisma.carWashStation.count({
        where: {
          status: 'active',
        },
      });

      return {
        success: true,
        message: 'Real-time stats retrieved successfully',
        data: {
          today: {
            bookings: todayBookings,
            revenue: Number(todayRevenue._sum.total_amount || 0),
          },
          pendingPayments,
          activeStations,
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error retrieving real-time stats: ${error.message}`,
        data: null,
      };
    }
  }
}
