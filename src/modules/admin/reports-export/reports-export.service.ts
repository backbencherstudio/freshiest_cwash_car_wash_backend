import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FilterReportsDto } from './dto/filter-reports.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { BookingStatus } from './dto/filter-reports.dto';

@Injectable()
export class ReportsExportService {
  constructor(private readonly prisma: PrismaService) { }

  async getFilteredReports(filterDto: FilterReportsDto) {
    try {
      const whereCondition: any = {};

      // Date range filter
      if (filterDto.startDate || filterDto.endDate) {
        whereCondition.createdAt = {};
        if (filterDto.startDate) {
          whereCondition.createdAt.gte = new Date(filterDto.startDate);
        }
        if (filterDto.endDate) {
          whereCondition.createdAt.lte = new Date(filterDto.endDate);
        }
      }

      // Status filter
      if (filterDto.status && filterDto.status !== 'all') {
        whereCondition.status = filterDto.status;
      }

      // Service type filter
      if (filterDto.serviceType && filterDto.serviceType !== 'all') {
        whereCondition.service = {
          name: {
            contains: filterDto.serviceType,
            mode: 'insensitive'
          }
        };
      }

      // Provider filter
      if (filterDto.providerId && filterDto.providerId !== 'all') {
        whereCondition.car_wash_station = {
          user_id: filterDto.providerId
        };
      }

      const [bookings, totalBookings, totalEarnings] = await Promise.all([
        this.prisma.booking.findMany({
          where: whereCondition,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              }
            },
            service: {
              select: {
                name: true,
                price: true,
              }
            },
            car_wash_station: {
              select: {
                name: true,
                location: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  }
                }
              }
            }
          },
          orderBy: { created_at: 'desc' },
          take: 10
        }),
        this.prisma.booking.count({ where: whereCondition }),
        this.prisma.booking.aggregate({
          where: {
            ...whereCondition,
            status: 'completed'
          },
          _sum: {
            total_amount: true
          }
        })
      ]);

      return {
        success: true,
        data: {
          bookings,
          summary: {
            totalBookings,
            totalEarnings: Number(totalEarnings._sum.total_amount || 0),
            completedBookings: bookings.filter(b => b.status === 'completed').length
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getBookingManagement(queryDto: BookingQueryDto) {
    try {
      const { tab = 'all', page = 1, limit = 10 } = queryDto;
      const skip = (page - 1) * limit;

      let whereCondition: any = {};

      // Apply tab filter
      if (tab !== 'all') {
        if (tab === 'scheduled') {
          whereCondition.status = 'pending';
        } else if (tab === 'ongoing') {
          whereCondition.status = 'ongoing';
        } else if (tab === 'completed') {
          whereCondition.status = 'completed';
        } else if (tab === 'cancelled') {
          whereCondition.status = 'cancelled';
        }
      }

      const [bookings, total] = await Promise.all([
        this.prisma.booking.findMany({
          where: whereCondition,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              }
            },
            service: {
              select: {
                name: true,
                price: true,
              }
            },
            car_wash_station: {
              select: {
                name: true,
                location: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  }
                }
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }),
        this.prisma.booking.count({ where: whereCondition })
      ]);

      // Transform bookings to match UI format
      const transformedBookings = bookings.map(booking => ({
        id: booking.id,
        bookingId: `BK${booking.id.slice(-3).toUpperCase()}`,
        customer: {
          name: booking.user?.name || 'Unknown Customer',
          avatar: booking.user?.avatar
        },
        service: {
          name: booking.service?.name || 'Unknown Service',
          location: booking.car_wash_station?.location || 'Unknown Location'
        },
        vehicle: {
          type: booking.carType || 'Unknown Vehicle',
          plate: 'ABC-123' // This would come from a vehicle table in real implementation
        },
        dateTime: {
          date: booking.bookingDate?.toISOString().split('T')[0] || 'Unknown Date',
          time: '09:00 PM' // This would come from time slot in real implementation
        },
        washer: {
          name: booking.car_wash_station?.user?.name || 'Unknown Washer',
          avatar: booking.car_wash_station?.user?.avatar
        },
        status: booking.status,
        earning: Number(booking.total_amount || 0)
      }));

      return {
        success: true,
        data: {
          bookings: transformedBookings,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getServiceProviderEarningsSummary() {
    try {
      const providers = await this.prisma.user.findMany({
        where: {
          AND: [
            { deleted_at: null },
            { status: 1 },
            {
              OR: [
                { roles: { some: { name: 'washer' } } },
                { type: 'vendor' },
                { car_wash_station: { isNot: null } },
              ],
            },
          ],
        },
        include: {
          car_wash_station: {
            include: {
              bookings: {
                where: {
                  status: 'completed'
                }
              }
            }
          }
        },
        take: 4
      });

      const earningsData = providers.map(provider => {
        let totalEarnings = 0;
        let totalBookings = 0;

        if (provider.car_wash_station) {
          const station = provider.car_wash_station;
          totalBookings += station.bookings.length;
          totalEarnings += station.bookings.reduce((sum, booking) =>
            sum + Number(booking.total_amount || 0), 0
          );
        }

        const platformFee = totalEarnings * 0.2; // 20% platform fee
        const netEarning = totalEarnings - platformFee;

        return {
          provider: {
            name: provider.name || 'Unknown Provider',
            avatar: provider.avatar
          },
          totalEarnings: totalEarnings,
          platformFee: platformFee,
          netEarning: netEarning,
          booking: totalBookings,
          period: 'June 20, 2025' // This would be calculated from date range
        };
      });

      return {
        success: true,
        data: earningsData
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getServiceProviderEarningsDetailed() {
    try {
      const providers = await this.prisma.user.findMany({
        where: {
          AND: [
            { deleted_at: null },
            { status: 1 },
            {
              OR: [
                { roles: { some: { name: 'washer' } } },
                { type: 'vendor' },
                { car_wash_station: { isNot: null } },
              ],
            },
          ],
        },
        include: {
          car_wash_station: {
            include: {
              bookings: {
                where: {
                  status: 'completed'
                }
              },
              reviews: true
            }
          }
        },
        take: 4
      });

      const detailedData = providers.map(provider => {
        let totalBookings = 0;
        let completedBookings = 0;
        let totalEarnings = 0;
        let totalRating = 0;
        let ratingCount = 0;

        if (provider.car_wash_station) {
          const station = provider.car_wash_station;
          totalBookings += station.bookings.length;
          completedBookings += station.bookings.filter(b => b.status === 'completed').length;
          totalEarnings += station.bookings.reduce((sum, booking) =>
            sum + Number(booking.total_amount || 0), 0
          );

          station.reviews.forEach(review => {
            totalRating += review.rating;
            ratingCount++;
          });
        }

        const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

        return {
          provider: {
            name: provider.name || 'Unknown Provider',
            avatar: provider.avatar
          },
          totalBooking: totalBookings,
          completed: completedBookings,
          totalEarnings: totalEarnings,
          avgRating: avgRating,
          lastActive: 'June 20, 2025', // This would be calculated from last booking
          status: 'Active'
        };
      });

      return {
        success: true,
        data: detailedData
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async exportBookingsCSV(filterDto: FilterReportsDto) {
    try {
      // Implementation for CSV export for bookings
      console.log(filterDto);
      console.log('exportBookingsCSV');
      // This would generate and return a CSV file



      return {
        success: true,
        message: 'CSV export functionality would be implemented here',
        data: null
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async exportEarningsCSV() {
    try {
      // Implementation for CSV export for earnings                 
      // console.log('exportEarningsCSV');
      // This would generate and return a CSV file
      return {
        success: true,
        message: 'CSV export functionality would be implemented here',
        data: null
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
