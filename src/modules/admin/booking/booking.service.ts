import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { TransactionRepository } from 'src/common/repository/transaction/transaction.repository';

@Injectable()
export class BookingService {
    constructor(private prisma: PrismaService) { }


    async findAll(searchQuery: string | null) {
        try {
            const whereClause: any = {};
            // Add search functionality for fields: carType, status, payment_status, etc.
            if (searchQuery) {
                whereClause['OR'] = [
                    { carType: { contains: searchQuery, mode: 'insensitive' } },
                    { status: { contains: searchQuery, mode: 'insensitive' } },
                    { payment_status: { contains: searchQuery, mode: 'insensitive' } },
                    { user: { name: { contains: searchQuery, mode: 'insensitive' } } },
                    { user: { email: { contains: searchQuery, mode: 'insensitive' } } },
                    { car_wash_station: { name: { contains: searchQuery, mode: 'insensitive' } } },
                ];
            }

            // Fetch the bookings based on the whereClause
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
                    createdAt: true,
                    user: {
                        select: {
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
                    time_slot: {
                        select: {
                            start_time: true,
                            end_time: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            return {
                success: true,
                message: bookings.length > 0 ? 'Bookings retrieved successfully' : 'No bookings found',
                data: bookings,
            };
        } catch (error) {
            return {
                success: false,
                message: `Error fetching bookings: ${error.message}`,
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
                    createdAt: true,
                    updatedAt: true,
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
                    createdAt: true,
                    updatedAt: true,
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
