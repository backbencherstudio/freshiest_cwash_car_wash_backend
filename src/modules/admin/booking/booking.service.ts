import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { TransactionRepository } from 'src/common/repository/transaction/transaction.repository';

@Injectable()
export class BookingService {
    constructor(private prisma: PrismaService) { }

    async create(createBookingDto: CreateBookingDto, user_id: string) {
        const transaction = await this.prisma.$transaction(async (prisma) => {
          try {
            // Ensure bookingDate is properly formatted for Prisma
            if (createBookingDto.bookingDate) {
              createBookingDto.bookingDate = new Date(createBookingDto.bookingDate).toISOString();
            } else {
              const timeSlot = await prisma.timeSlot.findFirst({
                where: { id: createBookingDto.time_slot_id },
                select: { availability: { select: { date: true } } }
              });
              createBookingDto.bookingDate = timeSlot.availability.date.toISOString();
            }
    
            // Check if the service belongs to a car wash station and set car wash station ID
            if (createBookingDto.service_id) {
              const service = await prisma.service.findUnique({
                where: { id: createBookingDto.service_id },
                select: { car_wash_station_id: true }
              });
              if (service.car_wash_station_id) {
                createBookingDto.car_wash_station_id = service.car_wash_station_id;
              }
            }
    
            // Check if the time slot is available
            const timeSlotAvailability = await this.checkTimeSlotAvailability(
              createBookingDto.time_slot_id,
              createBookingDto.bookingDate,
              createBookingDto.car_wash_station_id
            );
    
            if (!timeSlotAvailability.success) {
              throw new Error(timeSlotAvailability.message);
            }
    
            // Calculate total amount with service price and voucher discount
            const totalAmount = await this.calculateTotalAmount(
              createBookingDto.service_id,
              createBookingDto.voucher_code
            );
    
            if (!totalAmount.success) {
              throw new Error(totalAmount.message);
            }
    
            // Create booking transaction
            const booking = await prisma.booking.create({
              data: {
                user: { connect: { id: user_id } },
                service: { connect: { id: createBookingDto.service_id } },
                car_wash_station: { connect: { id: createBookingDto.car_wash_station_id } },
                time_slot: { connect: { id: createBookingDto.time_slot_id } },
                carType: createBookingDto.carType,
                bookingDate: createBookingDto.bookingDate,
                total_amount: totalAmount.data.total_amount,
                status: createBookingDto.status,
                payment_status: createBookingDto.payment_status,
                payment_raw_status: createBookingDto.payment_raw_status,
                paid_amount: createBookingDto.paid_amount,
                paid_currency: createBookingDto.paid_currency,
                payment_provider: createBookingDto.payment_provider,
                payment_reference_number: createBookingDto.payment_reference_number,
                payment_provider_charge_type: createBookingDto.payment_provider_charge_type,
                payment_provider_charge: createBookingDto.payment_provider_charge,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    billing_id: true,
                  },
                },
              },
            });
    
            // Create Stripe PaymentIntent
            let paymentIntent;
            try {
              let customerId = booking.user.billing_id;
              if (!customerId) {
                const customer = await StripePayment.createCustomer({
                  user_id: booking.user.id,
                  name: booking.user.name || 'Unknown',
                  email: booking.user.email || '',
                });
                customerId = customer.id;
    
                // Update user with Stripe customer ID
                await prisma.user.update({
                  where: { id: booking.user.id },
                  data: { billing_id: customerId },
                });
              }
    
              paymentIntent = await StripePayment.createPaymentIntent({
                amount: Number(booking.total_amount), 
                currency: 'usd',
                customer_id: customerId,
                metadata: {
                  bookingId: booking.id,
                  userId: booking.user.id,
                  bookingDate: booking.bookingDate.toISOString(),
                  time_slot_id: booking.time_slot_id,
                  service_id: booking.service_id,
                },
              });
            } catch (stripeError) {
              console.error('Error creating Stripe payment intent:', stripeError);
            }
    
            // Create PaymentTransaction record if payment intent was created
            if (paymentIntent) {
              try {
                await TransactionRepository.createTransaction({
                  booking_id: booking.id,
                  user_id: user_id,
                  amount: Number(booking.total_amount),
                  currency: 'usd',
                  reference_number: paymentIntent.id,
                  status: 'pending',
                });
              } catch (transactionError) {
                console.error('Error creating payment transaction:', transactionError);
              }
            }
    
            return {
              success: true,
              message: 'Booking created successfully',
              data: {
                ...booking,
                payment_intent: paymentIntent ? {
                  id: paymentIntent.id,
                  client_secret: paymentIntent.client_secret,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency,
                  status: paymentIntent.status
                } : null,
                note: paymentIntent ? 'Payment intent created successfully' : 'Payment intent creation failed, but booking was created'
              },
            };
          } catch (error) {
            return {
              success: false,
              message: `Error creating booking: ${error.message}`,
            };
          }
        });
        return transaction;
      }

    async findAll(searchQuery: string | null, userId: string) {
        try {
            const whereClause: any = {};

            // If user_id is provided, check user type and filter accordingly
            if (userId) {
                const userDetails = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { type: true }
                });

                if (userDetails) {
                    switch (userDetails.type) {
                        case 'washer':
                            // Washers can see all bookings for their car wash station
                            // We need to get the car wash station ID for this washer
                            const washerStation = await this.prisma.availability.findFirst({
                                where: { user_id: userId },
                                select: { car_wash_station_id: true }
                            });
                            if (washerStation) {
                                whereClause.car_wash_station_id = washerStation.car_wash_station_id;
                            }
                            break;
                        case 'user':
                            // Regular users can only see their own bookings
                            whereClause.user_id = userId;
                            break;
                        case 'admin':
                            // Admins can see all bookings (no filter applied)
                            break;
                        default:
                            // For any other type, restrict to own bookings
                            whereClause.user_id = userId;
                            break;
                    }
                }
            }

            // Add search functionality
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

    async findOne(id: string, userId: string) {
        try {
            const whereClause: any = { id };

            // If user_id is provided, check user type and filter accordingly
            if (userId) {
                const userDetails = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { type: true }
                });

                if (userDetails) {
                    switch (userDetails.type) {
                        case 'washer':
                            // Washers can see all bookings for their car wash station
                            // We need to get the car wash station ID for this washer
                            const washerStation = await this.prisma.availability.findFirst({
                                where: { user_id: userId },
                                select: { car_wash_station_id: true }
                            });
                            if (washerStation) {
                                whereClause.car_wash_station_id = washerStation.car_wash_station_id;
                            }
                            break;
                        case 'user':
                            // Regular users can only see their own bookings
                            whereClause.user_id = userId;
                            break;
                        case 'admin':
                            // Admins can see all bookings (no filter applied)
                            break;
                        default:
                            // For any other type, restrict to own bookings
                            whereClause.user_id = userId;
                            break;
                    }
                }
            }

            const booking = await this.prisma.booking.findFirst({
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
                            phone_number: true,
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

            // Check access control based on user type
            if (userId && booking.user_id !== userId) {
                const userDetails = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { type: true }
                });

                if (userDetails) {
                    switch (userDetails.type) {
                        case 'washer':
                            // Washers can access bookings for their car wash station
                            const washerStation = await this.prisma.availability.findFirst({
                                where: { user_id: userId },
                                select: { car_wash_station_id: true }
                            });
                            if (washerStation && washerStation.car_wash_station_id === booking.car_wash_station_id) {
                                // Washer has access to this booking
                                break;
                            } else {
                                return {
                                    success: false,
                                    message: 'Access denied. You can only view bookings for your car wash station.',
                                };
                            }
                        case 'user':
                            // Regular users can only access their own bookings
                            return {
                                success: false,
                                message: 'Access denied. You can only view your own bookings.',
                            };
                        case 'admin':
                            // Admins can access all bookings
                            break;
                        default:
                            // For any other type, restrict access
                            return {
                                success: false,
                                message: 'Access denied. You can only view your own bookings.',
                            };
                    }
                }
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

    async update(id: string, updateBookingDto: UpdateBookingDto, userId: string) {
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

            // Check access control based on user type
            if (userId && existingBooking.user_id !== userId) {
                const userDetails = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { type: true }
                });

                if (userDetails) {
                    switch (userDetails.type) {
                        case 'washer':
                            // Washers can update bookings for their car wash station
                            const washerStation = await this.prisma.availability.findFirst({
                                where: { user_id: userId },
                                select: { car_wash_station_id: true }
                            });
                            if (washerStation && washerStation.car_wash_station_id === existingBooking.car_wash_station_id) {
                                // Washer has access to update this booking
                                break;
                            } else {
                                return {
                                    success: false,
                                    message: 'Access denied. You can only update bookings for your car wash station.',
                                };
                            }
                        case 'user':
                            // Regular users can only update their own bookings
                            return {
                                success: false,
                                message: 'Access denied. You can only update your own bookings.',
                            };
                        case 'admin':
                            // Admins can update all bookings
                            break;
                        default:
                            // For any other type, restrict access
                            return {
                                success: false,
                                message: 'Access denied. You can only update your own bookings.',
                            };
                    }
                }
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

    async remove(id: string, userId: string) {
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

            // Check access control based on user type
            if (userId && existingBooking.user_id !== userId) {
                const userDetails = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { type: true }
                });

                if (userDetails) {
                    switch (userDetails.type) {
                        case 'washer':
                            // Washers can delete bookings for their car wash station
                            const washerStation = await this.prisma.availability.findFirst({
                                where: { user_id: userId },
                                select: { car_wash_station_id: true }
                            });
                            if (washerStation && washerStation.car_wash_station_id === existingBooking.car_wash_station_id) {
                                // Washer has access to delete this booking
                                break;
                            } else {
                                return {
                                    success: false,
                                    message: 'Access denied. You can only delete bookings for your car wash station.',
                                };
                            }
                        case 'user':
                            // Regular users can only delete their own bookings
                            return {
                                success: false,
                                message: 'Access denied. You can only delete your own bookings.',
                            };
                        case 'admin':
                            // Admins can delete all bookings
                            break;
                        default:
                            // For any other type, restrict access
                            return {
                                success: false,
                                message: 'Access denied. You can only delete your own bookings.',
                            };
                    }
                }
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

    async getBookingsByStatus(status: string, userId: string) {
        try {
            const whereClause: any = { status };

            // If user_id is provided, check user type and filter accordingly
            if (userId) {
                const userDetails = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { type: true }
                });

                if (userDetails) {
                    switch (userDetails.type) {
                        case 'washer':
                            // Washers can see all bookings for their car wash station
                            // We need to get the car wash station ID for this washer
                            const washerStation = await this.prisma.availability.findFirst({
                                where: { user_id: userId },
                                select: { car_wash_station_id: true }
                            });
                            if (washerStation) {
                                whereClause.car_wash_station_id = washerStation.car_wash_station_id;
                            }
                            break;
                        case 'user':
                            // Regular users can only see their own bookings
                            whereClause.user_id = userId;
                            break;
                        case 'admin':
                            // Admins can see all bookings (no filter applied)
                            break;
                        default:
                            // For any other type, restrict to own bookings
                            whereClause.user_id = userId;
                            break;
                    }
                }
            }

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
                    createdAt: true,
                    updatedAt: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    service: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                        },
                    },
                    car_wash_station: {
                        select: {
                            id: true,
                            name: true,
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
                orderBy: { createdAt: 'desc' },
            });

            return {
                success: true,
                message: `Bookings with status '${status}' retrieved successfully`,
                data: bookings,
                total: bookings.length,
            };
        } catch (error) {
            return {
                success: false,
                message: `Error fetching bookings by status: ${error.message}`,
            };
        }
    }

    async getBookingsByDateRange(startDate: string, endDate: string, userId: string) {
        try {
            const whereClause: any = {
                bookingDate: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            };

            // If user_id is provided, check user type and filter accordingly
            if (userId) {
                const userDetails = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { type: true }
                });

                if (userDetails) {
                    switch (userDetails.type) {
                        case 'washer':
                            // Washers can see all bookings for their car wash station
                            // We need to get the car wash station ID for this washer
                            const washerStation = await this.prisma.availability.findFirst({
                                where: { user_id: userId },
                                select: { car_wash_station_id: true }
                            });
                            if (washerStation) {
                                whereClause.car_wash_station_id = washerStation.car_wash_station_id;
                            }
                            break;
                        case 'user':
                            // Regular users can only see their own bookings
                            whereClause.user_id = userId;
                            break;
                        case 'admin':
                            // Admins can see all bookings (no filter applied)
                            break;
                        default:
                            // For any other type, restrict to own bookings
                            whereClause.user_id = userId;
                            break;
                    }
                }
            }

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
                    createdAt: true,
                    updatedAt: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    service: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                        },
                    },
                    car_wash_station: {
                        select: {
                            id: true,
                            name: true,
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
                orderBy: { bookingDate: 'asc' },
            });

            return {
                success: true,
                message: `Bookings from ${startDate} to ${endDate} retrieved successfully`,
                data: bookings,
                total: bookings.length,
            };
        } catch (error) {
            return {
                success: false,
                message: `Error fetching bookings by date range: ${error.message}`,
            };
        }
    }

    /**
     * Check if a time slot is available for booking on a specific date
     */
    private async checkTimeSlotAvailability(
        timeSlotId: string,
        bookingDate: string,
        carWashStationId: string
    ) {
        try {
            // Convert booking date to start and end of day for comparison
            const requestedDate = new Date(bookingDate);
            const startOfDay = new Date(requestedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(requestedDate);
            endOfDay.setHours(23, 59, 59, 999);

            // Check if there are any existing bookings for this time slot on the requested date
            const existingBookings = await this.prisma.booking.findMany({
                where: {
                    time_slot_id: timeSlotId,
                    car_wash_station_id: carWashStationId,
                    bookingDate: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                    status: {
                        notIn: ['cancelled', 'rejected'] // Exclude cancelled/rejected bookings
                    }
                },
                select: {
                    id: true,
                    status: true,
                }
            });

            if (existingBookings.length > 0) {
                return {
                    success: false,
                    message: 'This time slot is already booked for the requested date. Please choose another time or date.',
                    data: {
                        conflicting_bookings: existingBookings,
                        requested_date: requestedDate,
                        time_slot_id: timeSlotId
                    }
                };
            }

            // Verify that the time slot exists and belongs to the car wash station
            const timeSlot = await this.prisma.timeSlot.findFirst({
                where: {
                    id: timeSlotId,
                    availability: {
                        car_wash_station_id: carWashStationId
                    }
                },
                include: {
                    availability: {
                        select: {
                            date: true,
                            day: true
                        }
                    }
                }
            });

            if (!timeSlot) {
                return {
                    success: false,
                    message: 'Time slot not found or does not belong to the specified car wash station.',
                };
            }

            // Check if the time slot is available for the requested day of the week
            const requestedDay = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });
            if (timeSlot.availability.day !== requestedDay) {
                return {
                    success: false,
                    message: `This time slot is only available on ${timeSlot.availability.day}, but you requested ${requestedDay}.`,
                };
            }

            return {
                success: true,
                message: 'Time slot is available for booking.',
                data: {
                    time_slot: timeSlot,
                    requested_date: requestedDate,
                    day_of_week: requestedDay
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Error checking time slot availability: ${error.message}`,
            };
        }
    }
    /**
     * Calculate total amount for a booking including service price and voucher discount
     */
    private async calculateTotalAmount(serviceId: string, voucherCode?: string) {
        try {
            // Get service details
            const service = await this.prisma.service.findUnique({
                where: { id: serviceId },
                select: { price: true, name: true }
            });

            if (!service) {
                return {
                    success: false,
                    message: 'Service not found',
                };
            }

            let totalAmount = service.price;
            let discountAmount = 0;
            let voucherDetails = null;

            // Apply voucher discount if provided
            if (voucherCode) {
                const voucher = await this.prisma.voucher.findFirst({
                    where: {
                        code: voucherCode,
                        is_active: true,
                        expiryDate: {
                            gte: new Date()
                        }
                    }
                });

                if (voucher) {
                    discountAmount = (totalAmount * voucher.discount_percentage) / 100;
                    totalAmount = totalAmount - discountAmount;
                    voucherDetails = {
                        code: voucher.code,
                        discount_percentage: voucher.discount_percentage,
                        discount_amount: discountAmount
                    };
                } else {
                    return {
                        success: false,
                        message: 'Invalid or expired voucher code',
                    };
                }
            }

            return {
                success: true,
                data: {
                    total_amount: totalAmount,
                    original_price: service.price,
                    discount_amount: discountAmount,
                    voucher_details: voucherDetails
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Error calculating total amount: ${error.message}`,
            };
        }
    }
}
