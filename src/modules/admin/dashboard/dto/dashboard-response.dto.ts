import { ApiProperty } from '@nestjs/swagger';

export class CarWashChartDataDto {
    @ApiProperty({ description: 'Revenue range (e.g., 10k, 20k)' })
    range: string;

    @ApiProperty({ description: 'Number of stations in this range' })
    count: number;

    @ApiProperty({ description: 'Color for the chart bar' })
    color: string;

    @ApiProperty({ description: 'Average revenue for this range' })
    revenue: number;
}

export class RevenueByStationDto {
    @ApiProperty({ description: 'Car wash station ID' })
    stationId: string;

    @ApiProperty({ description: 'Total revenue from this station' })
    revenue: number;

    @ApiProperty({ description: 'Number of bookings from this station' })
    bookings: number;
}

export class RevenueByServiceDto {
    @ApiProperty({ description: 'Service ID' })
    serviceId: string;

    @ApiProperty({ description: 'Total revenue from this service' })
    revenue: number;

    @ApiProperty({ description: 'Number of bookings for this service' })
    bookings: number;
}

export class MonthlyRevenueDto {
    @ApiProperty({ description: 'Month of the revenue' })
    month: Date;

    @ApiProperty({ description: 'Revenue for this month' })
    revenue: number;
}

export class CarWashStatsDto {
    @ApiProperty({ description: 'Total revenue from all completed bookings' })
    totalRevenue: number;

    @ApiProperty({ description: 'Total number of completed bookings' })
    totalBookings: number;

    @ApiProperty({ description: 'Chart data for revenue ranges', type: [CarWashChartDataDto] })
    chartData: CarWashChartDataDto[];

    @ApiProperty({ description: 'Revenue breakdown by car wash station', type: [RevenueByStationDto] })
    revenueByStation: RevenueByStationDto[];

    @ApiProperty({ description: 'Revenue breakdown by service', type: [RevenueByServiceDto] })
    revenueByService: RevenueByServiceDto[];

    @ApiProperty({ description: 'Monthly revenue for the last 8 months', type: [MonthlyRevenueDto] })
    monthlyRevenue: MonthlyRevenueDto[];
}

export class IncomeBySourceDto {
    @ApiProperty({ description: 'Income source (GNote, Office, RCloud)' })
    source: string;

    @ApiProperty({ description: 'Revenue from this source' })
    revenue: number;

    @ApiProperty({ description: 'Percentage of total income from this source' })
    percentage: number;

    @ApiProperty({ description: 'Color for the donut chart segment' })
    color: string;
}

export class IncomeComparisonDto {
    @ApiProperty({ description: 'Current period income' })
    currentPeriod: number;

    @ApiProperty({ description: 'Previous period income' })
    previousPeriod: number;

    @ApiProperty({ description: 'Absolute increase in income' })
    increase: number;

    @ApiProperty({ description: 'Percentage increase in income' })
    percentageIncrease: number;
}

export class IncomeAnalyticsDto {
    @ApiProperty({ description: 'Time period for the analytics (e.g., Apr - Jan)' })
    period: string;

    @ApiProperty({ description: 'Total income for the current period' })
    totalIncome: number;

    @ApiProperty({ description: 'Percentage increase from previous period' })
    percentageIncrease: number;

    @ApiProperty({ description: 'Absolute increase from previous period' })
    absoluteIncrease: number;

    @ApiProperty({ description: 'Income breakdown by source', type: [IncomeBySourceDto] })
    incomeBySource: IncomeBySourceDto[];

    @ApiProperty({ description: 'Period comparison data', type: IncomeComparisonDto })
    comparison: IncomeComparisonDto;
}

export class DashboardSummaryDto {
    @ApiProperty({ description: 'Total revenue from all sources' })
    totalRevenue: number;

    @ApiProperty({ description: 'Total number of bookings' })
    totalBookings: number;

    @ApiProperty({ description: 'Total income for the period' })
    totalIncome: number;

    @ApiProperty({ description: 'Percentage increase in income' })
    percentageIncrease: number;
}

export class DashboardDataDto {
    @ApiProperty({ description: 'Car wash statistics', type: CarWashStatsDto })
    carWash: CarWashStatsDto;

    @ApiProperty({ description: 'Income analytics', type: IncomeAnalyticsDto })
    income: IncomeAnalyticsDto;

    @ApiProperty({ description: 'Dashboard summary', type: DashboardSummaryDto })
    summary: DashboardSummaryDto;
}

export class RealTimeStatsDto {
    @ApiProperty({ description: 'Today\'s statistics' })
    today: {
        bookings: number;
        revenue: number;
    };

    @ApiProperty({ description: 'Number of pending payments' })
    pendingPayments: number;

    @ApiProperty({ description: 'Number of active car wash stations' })
    activeStations: number;

    @ApiProperty({ description: 'Last update timestamp' })
    lastUpdated: string;
}

export class DashboardResponseDto {
    @ApiProperty({ description: 'Success status' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Dashboard data', type: DashboardDataDto })
    data: DashboardDataDto;
}

export class CarWashStatsResponseDto {
    @ApiProperty({ description: 'Success status' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Car wash statistics', type: CarWashStatsDto })
    data: CarWashStatsDto;
}

export class IncomeAnalyticsResponseDto {
    @ApiProperty({ description: 'Success status' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Income analytics', type: IncomeAnalyticsDto })
    data: IncomeAnalyticsDto;
}

export class RealTimeStatsResponseDto {
    @ApiProperty({ description: 'Success status' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Real-time statistics', type: RealTimeStatsDto })
    data: RealTimeStatsDto;
}
