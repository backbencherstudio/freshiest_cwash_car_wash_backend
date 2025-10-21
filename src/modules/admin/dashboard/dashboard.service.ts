import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

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
            const monthlyRevenue = await this.prisma.booking.findMany({
                where: {
                    status: 'accept',
                    payment_status: 'succeeded',
                    created_at: {
                        gte: new Date(new Date().setMonth(new Date().getMonth() - 7)),
                    },
                },
                select: {
                    total_amount: true,
                    created_at: true,
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

            const chartData = revenueRanges.map(range => {
                const count = revenueByStation.filter(station => {
                    const revenue = Number(station._sum.total_amount || 0);
                    return revenue >= range.min && revenue < range.max;
                }).length;

                return {
                    range: range.range,
                    count,
                    color: range.color,
                    revenue: count * (range.min + range.max) / 2, // Average revenue for the range
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
                    monthlyRevenue: monthlyRevenue.reduce((acc, booking) => {
                        const monthKey = booking.created_at.toISOString().substring(0, 7); // YYYY-MM
                        if (!acc[monthKey]) {
                            acc[monthKey] = { month: booking.created_at, revenue: 0 };
                        }
                        acc[monthKey].revenue += Number(booking.total_amount || 0);
                        return acc;
                    }, {} as Record<string, { month: Date; revenue: number }>),
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
            const endOfMonth = new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)); // End of current month

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
                0
            );

            // Calculate income distribution across categories (simulated in this case)
            const sourceCategories = {
                'GNote': { color: 'green', revenue: 0, percentage: 0 },
                'Office': { color: 'darkblue', revenue: 0, percentage: 0 },
                'RCloud': { color: 'blue', revenue: 0, percentage: 0 },
            };

            if (incomeBySource.length > 0) {
                const totalRevenue = currentTotalIncome;

                // Simulate distribution across the sources
                sourceCategories['GNote'].revenue = totalRevenue * 0.35; // 35%
                sourceCategories['Office'].revenue = totalRevenue * 0.20; // 20%
                sourceCategories['RCloud'].revenue = totalRevenue * 0.45; // 45%

                // Calculate percentages for each category
                Object.keys(sourceCategories).forEach(key => {
                    sourceCategories[key].percentage = (sourceCategories[key].revenue / totalRevenue) * 100;
                });
            }

            return {
                success: true,
                message: 'Income analytics retrieved successfully',
                data: {
                    totalIncome: currentTotalIncome,
                    incomeBySource: Object.entries(sourceCategories).map(([source, data]) => ({
                        source,
                        revenue: Math.round(data.revenue * 100) / 100,
                        percentage: Math.round(data.percentage * 100) / 100,
                        color: data.color,
                    })),
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
    async getDashboardData(period: string = 'monthly') {
        try {
            // get total users
            const totalUsers = await this.prisma.user.count();

            // get total active bookings count
            const totalActiveBookings = await this.prisma.booking.count({
                where: {
                    status: 'Pending',
                    payment_status: 'succeeded',
                },
            });

            // get total completed bookings count
            const totalCompletedBookings = await this.prisma.booking.count({
                where: {
                    status: 'Completed',
                    payment_status: 'succeeded',
                },
            });

            // get total earnings
            const totalEarnings = await this.prisma.booking.aggregate({
                where: {
                    status: 'Completed',
                    payment_status: 'succeeded',
                },
                _sum: {
                    total_amount: true,
                },
            });

            // Get monthly bookings data for the last 12 months
            const monthlyBookingsData = await this.getMonthlyBookingsData();

            // Get top performing washers
            const topPerformingWashers = await this.getTopPerformingWashers(period || 'monthly');

            // Get busiest locations
            const busiestLocations = await this.getBusiestLocations(period || 'monthly');

            // Get pending withdrawals
            const pendingWithdrawals = await this.getPendingWithdrawals();

            return {
                success: true,
                message: 'Dashboard data retrieved successfully',
                data: {
                    totalUsers,
                    totalActiveBookings,
                    totalCompletedBookings,
                    totalEarnings: Number(totalEarnings._sum.total_amount || 0),
                    monthlyBookings: monthlyBookingsData,
                    topPerformingWashers,
                    busiestLocations,
                    pendingWithdrawals,
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
     * Get monthly bookings data for the last 12 months
     * Returns data for the monthly bookings line chart
     */
    async getMonthlyBookingsData() {
        try {
            const now = new Date();
            const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

            // Get monthly revenue data for the last 12 months
            const monthlyData = await this.prisma.booking.findMany({
                where: {
                    status: 'accept',
                    payment_status: 'succeeded',
                    created_at: {
                        gte: twelveMonthsAgo,
                        lte: now,
                    },
                },
                select: {
                    total_amount: true,
                    created_at: true,
                },
            });

            // Generate data for all 12 months (even if no bookings)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const chartData = [];
            let totalRevenue = 0;

            // Group data by month
            const groupedData = monthlyData.reduce((acc, booking) => {
                const monthKey = booking.created_at.toISOString().substring(0, 7); // YYYY-MM
                if (!acc[monthKey]) {
                    acc[monthKey] = { revenue: 0, bookings: 0 };
                }
                acc[monthKey].revenue += Number(booking.total_amount || 0);
                acc[monthKey].bookings += 1;
                return acc;
            }, {} as Record<string, { revenue: number; bookings: number }>);

            for (let i = 0; i < 12; i++) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
                const monthKey = monthDate.getFullYear() + '-' + String(monthDate.getMonth() + 1).padStart(2, '0');

                const monthData = groupedData[monthKey] || { revenue: 0, bookings: 0 };
                totalRevenue += monthData.revenue;

                chartData.push({
                    month: months[monthDate.getMonth()],
                    year: monthDate.getFullYear(),
                    revenue: monthData.revenue,
                    bookings: monthData.bookings,
                    monthKey: monthKey,
                });
            }

            // Calculate percentage change (current month vs previous month)
            const currentMonthRevenue = chartData[chartData.length - 1]?.revenue || 0;
            const previousMonthRevenue = chartData[chartData.length - 2]?.revenue || 0;

            let percentageChange = 0;
            if (previousMonthRevenue > 0) {
                percentageChange = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
            }

            return {
                totalRevenue: totalRevenue,
                percentageChange: Math.round(percentageChange * 100) / 100,
                isPositive: percentageChange >= 0,
                chartData: chartData,
                currentMonth: {
                    month: chartData[chartData.length - 1]?.month || 'Dec',
                    year: chartData[chartData.length - 1]?.year || now.getFullYear(),
                    revenue: currentMonthRevenue,
                    bookings: chartData[chartData.length - 1]?.bookings || 0,
                },
            };
        } catch (error) {
            return {
                totalRevenue: 0,
                percentageChange: 0,
                isPositive: true,
                chartData: [],
                currentMonth: {
                    month: 'Jan',
                    year: new Date().getFullYear(),
                    revenue: 0,
                    bookings: 0,
                },
            };
        }
    }

    /**
     * Get top performing washers based on completed bookings and ratings
     * Returns data for the top performing washers widget
     */
    async getTopPerformingWashers(period: string = 'monthly') {
        try {
            // Calculate date range based on period
            const now = new Date();
            let startDate: Date;

            switch (period.toLowerCase()) {
                case 'daily':
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'weekly':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'yearly':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default: // monthly
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
            }

            // Get washers (users with washer role or station owners) with their booking stats
            const washers = await this.prisma.user.findMany({
                where: {
                    AND: [
                        { deleted_at: null },
                        { status: 1 },
                        {
                            OR: [
                                { roles: { some: { name: 'washer' } } },
                                { car_wash_station: { id: { not: null } } },
                            ],
                        },
                    ],
                },
                include: {
                    car_wash_station: {
                        include: {
                            bookings: {
                                where: {
                                    status: 'accept',
                                    payment_status: 'succeeded',
                                    created_at: {
                                        gte: startDate,
                                    },
                                },
                            },
                            reviews: {
                                where: {
                                    created_at: {
                                        gte: startDate,
                                    },
                                },
                            },
                        },
                    },
                },
            });

            // Calculate performance metrics for each washer
            const washerPerformance = washers.map(washer => {
                let totalJobs = 0;
                let totalRating = 0;
                let ratingCount = 0;

                // Aggregate data from all stations owned by this washer
                if (washer.car_wash_station) {
                    const station = washer.car_wash_station;
                    totalJobs += station.bookings.length;

                    station.reviews.forEach(review => {
                        totalRating += review.rating;
                        ratingCount++;
                    });
                }

                const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

                return {
                    id: washer.id,
                    name: washer.name || 'Unknown Washer',
                    email: washer.email,
                    totalJobs,
                    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
                    ratingCount,
                    stations: washer.car_wash_station || 0,
                };
            });

            // Sort by total jobs (descending) and take top 5
            const topWashers = washerPerformance
                .sort((a, b) => b.totalJobs - a.totalJobs)
                .slice(0, 5);

            // Generate chart data for the bar chart
            const chartData = topWashers.map((washer, index) => ({
                rank: index + 1,
                name: washer.name,
                jobs: washer.totalJobs,
                rating: washer.averageRating,
                // For visualization purposes, scale the bar height
                barHeight: Math.max(20, (washer.totalJobs / Math.max(...topWashers.map(w => w.totalJobs))) * 100),
            }));

            return {
                period,
                totalWashers: washers.length,
                topWashers: topWashers.map((washer, index) => ({
                    rank: index + 1,
                    name: washer.name,
                    jobs: washer.totalJobs,
                    rating: washer.averageRating,
                    ratingCount: washer.ratingCount,
                    stations: washer.stations,
                })),
                chartData,
            };
        } catch (error) {
            return {
                period,
                totalWashers: 0,
                topWashers: [],
                chartData: [],
            };
        }
    }

    /**
     * Get busiest locations based on booking activity
     * Returns data for the busiest locations widget
     */
    async getBusiestLocations(period: string = 'monthly') {
        try {
            // Calculate date range based on period
            const now = new Date();
            let startDate: Date;

            switch (period.toLowerCase()) {
                case 'daily':
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'weekly':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'yearly':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default: // monthly
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
            }

            // Get car wash stations with their booking counts for the period
            const stations = await this.prisma.carWashStation.findMany({
                where: {
                    status: 'active',
                },
                include: {
                    bookings: {
                        where: {
                            status: 'accept',
                            payment_status: 'succeeded',
                            created_at: {
                                gte: startDate,
                            },
                        },
                    },
                },
            });

            // Group by location and calculate activity
            const locationActivity = stations.reduce((acc, station) => {
                const location = station.location;

                if (!acc[location]) {
                    acc[location] = {
                        location,
                        totalBookings: 0,
                        totalRevenue: 0,
                        stationCount: 0,
                    };
                }

                acc[location].totalBookings += station.bookings.length;
                acc[location].totalRevenue += station.bookings.reduce((sum, booking) =>
                    sum + Number(booking.total_amount || 0), 0
                );
                acc[location].stationCount += 1;

                return acc;
            }, {} as Record<string, { location: string; totalBookings: number; totalRevenue: number; stationCount: number }>);

            // Convert to array and sort by total bookings
            const locations = Object.values(locationActivity)
                .sort((a, b) => b.totalBookings - a.totalBookings)
                .slice(0, 6); // Top 6 locations

            // Calculate max value for progress bar scaling
            const maxBookings = Math.max(...locations.map(loc => loc.totalBookings), 1);

            // Generate progress bar data
            const locationData = locations.map(location => ({
                location: location.location,
                bookings: location.totalBookings,
                revenue: location.totalRevenue,
                stations: location.stationCount,
                progressPercentage: Math.round((location.totalBookings / maxBookings) * 100),
                // For visualization, scale to 0-100 range
                activityScore: Math.round((location.totalBookings / maxBookings) * 100),
            }));

            return {
                period,
                totalLocations: Object.keys(locationActivity).length,
                locations: locationData,
            };
        } catch (error) {
            return {
                period,
                totalLocations: 0,
                locations: [],
            };
        }
    }

    /**
     * Get pending withdrawals
     * Returns data for the pending withdrawals widget
     */
    async getPendingWithdrawals() {
        try {
            // Get pending withdrawal transactions
            const pendingWithdrawals = await this.prisma.paymentTransaction.findMany({
                where: {
                    type: 'withdrawal',
                    status: 'pending',
                    deleted_at: null,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
                take: 10, // Limit to 10 most recent
            });

            // Format withdrawal data
            const withdrawalData = pendingWithdrawals.map((withdrawal, index) => ({
                id: withdrawal.id,
                withdrawalId: `WD-${withdrawal.id.slice(-4).toUpperCase()}`, // Generate WD-XXXX format
                userName: withdrawal.user?.name || 'Unknown User',
                userEmail: withdrawal.user?.email || '',
                paymentMethod: withdrawal.withdraw_via || 'wallet',
                amount: Number(withdrawal.amount || 0),
                currency: withdrawal.currency || 'USD',
                requestedAt: withdrawal.created_at,
                requestedTime: withdrawal.created_at.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                status: withdrawal.status,
                referenceNumber: withdrawal.reference_number,
            }));

            // Calculate total pending amount
            const totalPendingAmount = withdrawalData.reduce((sum, withdrawal) =>
                sum + withdrawal.amount, 0
            );

            return {
                totalPending: withdrawalData.length,
                totalAmount: totalPendingAmount,
                withdrawals: withdrawalData,
            };
        } catch (error) {
            return {
                totalPending: 0,
                totalAmount: 0,
                withdrawals: [],
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
