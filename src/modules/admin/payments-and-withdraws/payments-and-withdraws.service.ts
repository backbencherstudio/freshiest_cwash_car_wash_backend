import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePaymentsAndWithdrawDto } from './dto/create-payments-and-withdraw.dto';
import { UpdatePaymentsAndWithdrawDto } from './dto/update-payments-and-withdraw.dto';

@Injectable()
export class PaymentsAndWithdrawsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    try {
      // Get summary cards data
      const summaryCards = await this.getSummaryCards();

      // Get service provider earnings (4 providers)
      const serviceProviderEarnings = await this.getServiceProviderEarnings();

      // Get recent withdrawal requests (4 requests)
      const recentWithdrawalRequests = await this.getRecentWithdrawalRequests();

      // Get payment history (4 transactions)
      const paymentHistory = await this.getPaymentHistory();

      return {
        success: true,
        message: 'Payments and withdrawals data fetched successfully',
        data: {
          summaryCards,
          serviceProviderEarnings,
          recentWithdrawalRequests,
          paymentHistory,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching payments and withdrawals data: ${error.message}`,
        data: null,
      };
    }
  }

  private async getSummaryCards() {
    // Get total platform revenue
    const totalRevenue = await this.prisma.booking.aggregate({
      where: {
        status: 'completed',
        payment_status: 'succeeded',
      },
      _sum: {
        total_amount: true,
      },
    });

    // Get active service providers count
    const activeProviders = await this.prisma.user.count({
      where: {
        AND: [
          { deleted_at: null },
          { status: 1 },
          {
            OR: [
              { roles: { some: { name: 'washer' } } },
              { car_wash_station: { isNot: null } },
            ],
          },
        ],
      },
    });

    // Get pending withdrawals count
    const pendingWithdrawals = await this.prisma.paymentTransaction.count({
      where: {
        type: 'withdrawal',
        status: 'pending',
        deleted_at: null,
      },
    });

    // Get flagged transactions count
    const flaggedTransactions = await this.prisma.paymentTransaction.count({
      where: {
        status: 'flagged',
        deleted_at: null,
      },
    });

    return {
      totalPlatformRevenue: Number(totalRevenue._sum.total_amount || 0),
      activeServiceProviders: activeProviders,
      pendingWithdrawals: pendingWithdrawals,
      flaggedTransactions: flaggedTransactions,
    };
  }

  private async getServiceProviderEarnings() {
    // Get top 4 service providers by earnings
    const providers = await this.prisma.user.findMany({
      where: {
        AND: [
          { deleted_at: null },
          { status: 1 },
          {
            OR: [
              { roles: { some: { name: 'washer' } } },
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
                status: 'completed',
                payment_status: 'succeeded',
              },
            },
            reviews: true,
          },
        },
      },
      take: 4,
    });

    return providers.map((provider, index) => {
      let totalEarnings = 0;
      let monthlyEarnings = 0;
      let totalJobs = 0;
      let totalRating = 0;
      let ratingCount = 0;

      // Calculate earnings and jobs from all stations
      if (provider.car_wash_station) {
        const station = provider.car_wash_station;
        totalJobs += station.bookings.length;
        totalEarnings += station.bookings.reduce((sum, booking) =>
          sum + Number(booking.total_amount || 0), 0
        );

        // Calculate monthly earnings (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const monthlyBookings = station.bookings.filter(booking =>
          booking.created_at >= thirtyDaysAgo
        );
        monthlyEarnings += monthlyBookings.reduce((sum, booking) =>
          sum + Number(booking.total_amount || 0), 0
        );

        // Calculate ratings
        station.reviews.forEach(review => {
          totalRating += review.rating;
          ratingCount++;
        });
      }

      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      return {
        provider: {
          name: provider.name || 'Unknown Provider',
          avatar: provider.avatar,
        },
        totalEarnings: {
          amount: totalEarnings,
          since: '2024-03-15', // Placeholder date
          formatted: `$${totalEarnings.toFixed(2)} Since 2024-03-15`,
        },
        monthly: {
          amount: monthlyEarnings,
          formatted: `$${monthlyEarnings.toFixed(2)}`,
        },
        jobs: totalJobs,
        rating: {
          value: averageRating,
          formatted: averageRating.toFixed(1),
        },
        trend: {
          percentage: 6.2, // Placeholder trend
          formatted: '6.2%',
        },
      };
    });
  }

  private async getRecentWithdrawalRequests() {
    // Get 4 most recent withdrawal requests
    const withdrawals = await this.prisma.paymentTransaction.findMany({
      where: {
        type: 'withdrawal',
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 4,
    });

    const providerNames = ['Albert Flores', 'Brooklyn Simmons', 'Theresa Webb', 'Darlene Robertson'];
    const methods = ['Bank Transfer', 'PayPal', 'Stripe', 'Bank Transfer'];
    const statuses = ['Pending', 'Pending', 'Pending', 'Flagged'];

    return withdrawals.map((withdrawal, index) => ({
      provider: {
        name: providerNames[index] || withdrawal.user?.name || 'Unknown Provider',
        avatar: withdrawal.user?.avatar,
      },
      amount: {
        date: 'June 20, 2025', // Placeholder date
      },
      method: methods[index] || 'Bank Transfer',
      rating: {
        value: 4.9,
        formatted: '4.9',
      },
      status: {
        value: statuses[index] || 'Pending',
        color: statuses[index] === 'Flagged' ? 'red' : 'orange',
      },
    }));
  }

  private async getPaymentHistory() {
    // Get 4 most recent payment transactions
    const payments = await this.prisma.paymentTransaction.findMany({
      where: {
        type: 'booking',
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 4,
    });

    const statuses = ['Complete', 'Pending', 'Pending', 'Pending'];

    return payments.map((payment, index) => ({
      dateTime: '2025-01-15 09:00 PM', // Placeholder date
      provider: payment.user?.name || 'Albert Flores',
      amount: {
        value: 4250.00,
        formatted: '$4250.00',
      },
      method: 'Bank Transfer',
      status: {
        value: statuses[index] || 'Pending',
        color: statuses[index] === 'Complete' ? 'green' : 'orange',
      },
      transactionId: 'TXN-ee124',
      fee: {
        value: 5.20,
        formatted: '$5.20',
      },
    }));
  }
}
