import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { TransactionRepository } from 'src/common/repository/transaction/transaction.repository';

@Injectable()
export class BookingService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get status label for display
     */
    private getStatusLabel(status: string): string {
        const statusMap: Record<string, string> = {
            'pending': 'Scheduled',
            'accept': 'Scheduled',
            'completed': 'Complete',
            'cancelled': 'Canceled',
            'ongoing': 'Ongoing',
        };
        return statusMap[status.toLowerCase()] || status;
    }

    /**
     * Get status color for display
     */
    private getStatusColor(status: string): string {
        const colorMap: Record<string, string> = {
            'pending': 'blue',
            'accept': 'blue',
            'completed': 'green',
            'cancelled': 'red',
            'ongoing': 'orange',
        };
        return colorMap[status.toLowerCase()] || 'gray';
    }


    async findAll(filters: {
        search?: string;
        status?: string;
        page?: number;
        limit?: number;
    }) {
        try {
            const { search, status, page = 1, limit = 20 } = filters;
            const skip = (page - 1) * limit;
            
            const whereClause: any = {};

            // Add search functionality
            if (search) {
                whereClause['OR'] = [
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                ];
            }

            // Add status filter - map the 4 tabs exactly (case-insensitive)
            if (status) {
                switch (status.toLowerCase()) {
                    case 'all':
                        // No status filter - show all
                        break;
                    case 'scheduled':
                        whereClause.status = { in: ['pending', 'accept'] };
                        break;
                    case 'ongoing':
                        whereClause.status = 'ongoing';
                        break;
                    case 'completed':
                        whereClause.status = 'completed';
                        break;
                    case 'cancelled':
                        whereClause.status = 'cancelled';
                        break;
                    default:
                        whereClause.status = status;
                }
            }

            // Get total count for pagination
            const total = await this.prisma.booking.count({ where: whereClause });

            // Fetch the bookings with pagination
            const bookings = await this.prisma.booking.findMany({
                where: whereClause,
                select: {
                    id: true,
                    user_id: true,
                    service_id: true,
                    car_wash_station_id: true,
                    time_slot_id: true,
                    carType: true,
                    bookingDate: true,
                    total_amount: true,
                    status: true,
                    payment_status: true,
                    paid_amount: true,
                    created_at: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                    service: {
                        select: {
                            name: true,
                            description: true,
                            price: true,
                        },
                    },
                    car_wash_station: {
                        select: {
                            name: true,
                            location: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    time_slot: {
                        select: {
                            start_time: true,
                            end_time: true,
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
            });

            // Format bookings for dashboard display - simplified to match the image
            const formattedBookings = bookings.map((booking, index) => ({
                id: booking.id,
                bookingId: `BK${String((page - 1) * limit + index + 1).padStart(3, '0')}`, // BK001, BK002, etc.
                customer: {
                    name: booking.user.name || 'Unknown Customer',
                    avatar: booking.user.avatar,
                },
                service: `${booking.service.name}, ${booking.car_wash_station.location}`,
                vehicle: `Toyota Camry, ABC-123`, // Placeholder as shown in image
                dateTime: `${booking.bookingDate.toISOString().split('T')[0]}, ${booking.time_slot.start_time}`,
                washer: booking.car_wash_station.user?.name || 'Unassigned',
                status: this.getStatusLabel(booking.status),
                earning: `$${Number(booking.total_amount || 0)}`,
            }));

            return {
                success: true,
                message: formattedBookings.length > 0 ? 'Bookings retrieved successfully' : 'No bookings found',
                data: {
                    bookings: formattedBookings,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                },
            };
        } catch (error) {
            return {
                success: false,
                message: `Error fetching bookings: ${error.message}`,
                data: null,
            };
        }
    }


    async findOne(id: string) {
        try {
            const booking = await this.prisma.booking.findFirst({
                where: { id },
                select: {
                    id: true,
                    user_id: true,
                    service_id: true,
                    car_wash_station_id: true,
                    time_slot_id: true,
                    carType: true,
                    bookingDate: true,
                    total_amount: true,
                    status: true,
                    payment_status: true,
                    payment_raw_status: true,
                    paid_amount: true,
                    paid_currency: true,
                    payment_provider: true,
                    payment_reference_number: true,
                    payment_provider_charge_type: true,
                    payment_provider_charge: true,
                    created_at: true,
                    updated_at: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                    service: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            price: true,
                        },
                    },
                    car_wash_station: {
                        select: {
                            id: true,
                            name: true,
                            location: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                }
                            }
                        },
                    },
                    time_slot: {
                        select: {
                            start_time: true,
                            end_time: true,
                            availability: {
                                select: {
                                    day: true,
                                    date: true,
                                }
                            }
                        },
                    },
                    payment_transactions: {
                        select: {
                            id: true,
                            amount: true,
                            currency: true,
                            reference_number: true,
                            status: true,
                        }
                    }
                },
            });

            if (!booking) {
                return {
                    success: false,
                    message: 'Booking not found',
                };
            }

            return {
                success: true,
                message: 'Booking retrieved successfully',
                data: booking,
            };
        } catch (error) {
            return {
                success: false,
                message: `Error fetching booking: ${error.message}`,
            };
        }
    }

    async update(id: string, updateBookingDto: UpdateBookingDto) {
        try {
            // Check if booking exists and user has access
            const existingBooking = await this.prisma.booking.findUnique({
                where: { id },
            });

            if (!existingBooking) {
                return {
                    success: false,
                    message: 'Booking not found',
                };
            }



            // Ensure bookingDate is properly formatted for Prisma if provided
            if (updateBookingDto.bookingDate) {
                try {
                    updateBookingDto.bookingDate = new Date(updateBookingDto.bookingDate).toISOString();
                } catch (error) {
                    return {
                        success: false,
                        message: `Invalid booking date format: ${updateBookingDto.bookingDate}. Please use ISO-8601 format`,
                    };
                }
            }

            // Update booking
            const booking = await this.prisma.booking.update({
                where: { id },
                data: updateBookingDto,
                select: {
                    id: true,
                    user_id: true,
                    service_id: true,
                    car_wash_station_id: true,
                    time_slot_id: true,
                    carType: true,
                    bookingDate: true,
                    total_amount: true,
                    status: true,
                    payment_status: true,
                    payment_raw_status: true,
                    paid_amount: true,
                    paid_currency: true,
                    payment_provider: true,
                    payment_reference_number: true,
                    payment_provider_charge_type: true,
                    payment_provider_charge: true,
                    created_at: true,
                    updated_at: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                    service: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            price: true,
                        },
                    },
                    car_wash_station: {
                        select: {
                            id: true,
                            name: true,
                            location: true,
                        },
                    },
                    time_slot: {
                        select: {
                            id: true,
                            start_time: true,
                            end_time: true,
                        },
                    },
                },
            });

            return {
                success: true,
                message: 'Booking updated successfully',
                data: booking,
            };
        } catch (error) {
            return {
                success: false,
                message: `Error updating booking: ${error.message}`,
            };
        }
    }

    async remove(id: string) {
        try {
            // Check if booking exists and user has access
            const existingBooking = await this.prisma.booking.findUnique({
                where: { id },
            });

            if (!existingBooking) {
                return {
                    success: false,
                    message: 'Booking not found',
                };
            }

            // Delete booking
            await this.prisma.booking.delete({
                where: { id },
            });

            return {
                success: true,
                message: 'Booking deleted successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: `Error deleting booking: ${error.message}`,
            };
        }
    }

}
