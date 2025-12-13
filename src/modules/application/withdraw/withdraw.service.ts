import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WithdrawService {
    constructor(private prisma: PrismaService) { }

    async getWeeklyIncome(user_id: string) {
        const today = new Date();
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 6); // last 7 days including today

        // Fetch completed, non-cancelled bookings for stations owned by washer
        const bookings = await this.prisma.booking.findMany({
            where: {
                car_wash_station: { user_id },
                status: { notIn: ['cancelled', 'rejected'] },
                payment_status: 'succeeded',
                bookingDate: { gte: start, lte: today },
            },
            select: { bookingDate: true, total_amount: true },
        });

        const map: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = d.toLocaleDateString('en-US', { weekday: 'long' });
            map[key] = 0;
        }

        for (const b of bookings) {
            const key = new Date(b.bookingDate).toLocaleDateString('en-US', { weekday: 'long' });
            map[key] = (map[key] || 0) + Number(b.total_amount || 0);
        }

        const breakdown = Object.keys(map).map((day) => ({ day, amount: map[day] }));
        const total = breakdown.reduce((s, x) => s + x.amount, 0);

        return { success: true, message: 'Weekly income', data: { breakdown, total } };
    }

    async getAvailableAmount(user_id: string) {
        // total completed revenue
        const completed = await this.prisma.booking.aggregate({
            _sum: { total_amount: true },
            where: {
                car_wash_station: { user_id },
                status: { notIn: ['cancelled', 'rejected'] },
                payment_status: 'succeeded',
            },
        });

        const totalRevenue = Number(completed._sum.total_amount || 0);

        // total withdrawals already requested (pending/processing/completed)
        const withdrawals = await this.prisma.paymentTransaction.aggregate({
            _sum: { amount: true },
            where: {
                user_id,
                type: 'withdraw',
                status: { in: ['pending', 'processing', 'completed'] },
            },
        });

        const alreadyRequested = Number(withdrawals._sum.amount || 0);
        const available = Math.max(0, totalRevenue - alreadyRequested);

        return { success: true, message: 'Available amount', data: { totalRevenue, alreadyRequested, available } };
    }

    async requestWithdraw(user_id: string, amount: number, via: string = 'wallet') {
        if (!amount || amount <= 0) {
            return { success: false, message: 'Amount must be greater than 0' };
        }

        const availability = await this.getAvailableAmount(user_id);
        const available = availability.data.available;
        if (amount > available) {
            return { success: false, message: 'Amount exceeds available balance', data: { available } };
        }

        const tx = await this.prisma.paymentTransaction.create({
            data: {
                user_id,
                type: 'withdraw',
                withdraw_via: via,
                status: 'pending',
                amount,
                currency: 'usd',
            },
            select: { id: true, status: true, amount: true, withdraw_via: true, created_at: true },
        });

        return { success: true, message: 'Withdraw request submitted', data: tx };
    }

    async getWithdrawHistory(user_id: string, status?: string) {
       
        const whereClause: any = {
            user_id,
            type: 'withdraw',
        };

        // Filter by status if provided
        if (status) {
            whereClause.status = status;
        }

        const withdrawals = await this.prisma.paymentTransaction.findMany({
            where: whereClause,
            select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                withdraw_via: true,
                reference_number: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: { created_at: 'desc' },
        });

        // Calculate totals by status
        const totals = {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
        };

        for (const w of withdrawals) {
            if (totals[w.status] !== undefined) {
                totals[w.status] += Number(w.amount || 0);
            }
        }

        return {
            success: true,
            message: withdrawals.length > 0 ? 'Withdraw history retrieved' : 'No withdrawals found',
            data: {
                withdrawals,
                totals,
                count: withdrawals.length,
            },
        };
    }
}
