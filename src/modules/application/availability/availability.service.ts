import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAvailabilityDto, CreateBulkAvailabilityDto, CreateAvailabilityRuleDto, GenerateAvailabilityFromRuleDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { AvailabilityHelper } from './availability.helper';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) { }

  async create(createAvailabilityDto: CreateAvailabilityDto, user_id: string) {
    try {

      // Ensure date is properly formatted for Prisma
      if (createAvailabilityDto.date) {
        try {
          createAvailabilityDto.date = AvailabilityHelper.formatDateForPrisma(createAvailabilityDto.date);
          createAvailabilityDto.day = AvailabilityHelper.getDayNameFromDate(createAvailabilityDto.date);
        } catch (error) {
          return {
            success: false,
            message: `Invalid date format: ${createAvailabilityDto.date}. Please use ISO-8601 format (e.g., '2024-01-01' or '2024-01-01T00:00:00.000Z')`,
          };
        }
      }

      // Validate required fields for automatic time slot generation
      if (!createAvailabilityDto.opening_time || !createAvailabilityDto.closing_time || !createAvailabilityDto.slot_duration_minutes) {
        return {
          success: false,
          message: 'opening_time, closing_time, and slot_duration_minutes are required for automatic time slot generation',
        };
      }

      // Enforce that the provided date's day is open according to AvailabilityRule
      if (!createAvailabilityDto.car_wash_station_id) {
        return {
          success: false,
          message: 'car_wash_station_id is required',
        };
      }
      const rule = await this.prisma.availabilityRule.findFirst({
        where: { car_wash_station_id: createAvailabilityDto.car_wash_station_id },
        select: { days_open: true },
      });
      if (!rule) {
        return {
          success: false,
          message: 'No availability rule found for this station. Please configure rules first.',
        };
      }
      const dayEnum = AvailabilityHelper.convertDayNameToEnum((createAvailabilityDto.day || '').toUpperCase());
      // If the day is not allowed by the rule, block creation
      if (!rule.days_open.includes(dayEnum)) {
        return {
          success: false,
          message: `Cannot create availability for ${createAvailabilityDto.day}. This day is closed by the station rules.`,
        };
      }

      // Use transaction to create availability and time slots together
      const availabilityResult = await this.prisma.$transaction(async (prisma) => {
        // Create availability first
        const availability = await prisma.availability.create({
          data: { ...createAvailabilityDto, user_id },
          select: {
            id: true,
            user_id: true,
            day: true,
            date: true,
            car_wash_station_id: true,
            opening_time: true,
            closing_time: true,
            slot_duration_minutes: true,
            is_closed: true,
            created_at: true,
            updated_at: true,
          },
        });

        // Always generate time slots automatically
        const generatedTimeSlots = AvailabilityHelper.generateTimeSlots(
          availability.opening_time,
          availability.closing_time,
          availability.slot_duration_minutes,
          availability.id
        );

        if (generatedTimeSlots.length > 0) {
          await prisma.timeSlot.createMany({
            data: generatedTimeSlots,
          });

          // Fetch the created time slots
          const createdTimeSlots = await prisma.timeSlot.findMany({
            where: { availability_id: availability.id },
            select: {
              id: true,
              start_time: true,
              end_time: true,
              availability_id: true,
              capacity: true,
              is_blocked: true,
              block_reason: true,
              created_at: true,
              updated_at: true,
            },
          });

          // Return availability with time slots
          return {
            ...availability,
            time_slots: createdTimeSlots,
          };
        }

        // Return availability without time slots if none were generated
        return {
          ...availability,
          time_slots: [],
        };
      });

      return {
        success: true,
        message: 'Availability created successfully with automatic time slots',
        data: availabilityResult,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating availability: ${error.message}`,
      };
    }
  }

  async findAll(page: number = 1, limit: number = 50, filters?: any) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause based on filters
      const whereClause: any = {};

      if (filters?.car_wash_station_id) {
        whereClause.car_wash_station_id = filters.car_wash_station_id;
      }

      if (filters?.date) {
        whereClause.date = filters.date;
      }

      if (filters?.is_closed !== undefined) {
        whereClause.is_closed = filters.is_closed;
      }

      if (filters?.user_id) {
        whereClause.user_id = filters.user_id;
      }

      // Get total count for pagination
      const total = await this.prisma.availability.count({
        where: whereClause,
      });

      // Get paginated results
      const availabilities = await this.prisma.availability.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          car_wash_station: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          time_slots: {
            select: {
              id: true,
              start_time: true,
              end_time: true,
              capacity: true,
              is_blocked: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        success: true,
        message: 'Availabilities retrieved successfully',
        data: availabilities,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching availabilities: ${error.message}`,
      };
    }
  }

  async availableToday(user_id?: string) {
    try {

      // Get today's date in ISO format, ensuring the time portion is set to midnight (UTC)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);  // Set time to 00:00:00.000 UTC
      const todayISOString = today.toISOString();  // This will return the full ISO string (with time)
      const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

      // If user is a washer, restrict results to their own stations
      let stationOwnerFilter: any = {};
      if (user_id) {
        try {
          const userTypeRecord = await this.prisma.user.findUnique({
            where: { id: user_id },
            select: { type: true },
          });
          if (userTypeRecord?.type?.toLowerCase() === 'washer') {
            stationOwnerFilter = { user_id: user_id };
          }
        } catch (_) {
          // ignore filter if user lookup fails
        }
      }

      // First, check if any car wash stations need availability created for today
      if (user_id) {
        const allStations = await this.prisma.carWashStation.findMany({
          where: stationOwnerFilter,
          select: {
            id: true,
            name: true,
          },
        });


        // Auto-create availability for stations that don't have it for today
        for (const station of allStations) {
          const existingAvailability = await this.prisma.availability.findFirst({
            where: {
              car_wash_station_id: station.id,
              date: todayISOString,
            },
          });

          if (!existingAvailability) {
            try {
              // Try to get default settings from an existing availability rule
              const defaultRule = await this.prisma.availabilityRule.findFirst({
                where: { car_wash_station_id: station.id },
                orderBy: { created_at: 'desc' },
                select: {
                  opening_time: true,
                  closing_time: true,
                  slot_duration_minutes: true,
                  days_open: true
                },
              });

              if (!defaultRule) {
                // No rule configured; skip auto-creation
                continue;
              }

              // // Validate today's day against rule
              const dayEnum = AvailabilityHelper.convertDayNameToEnum(todayDayName);
              if (!defaultRule.days_open.includes(dayEnum)) {
                // Today is closed according to rule; skip auto-creation
                continue;
              }

              // Use rule settings for auto-creation
              const newAvailabilityDto = {
                date: todayISOString,
                car_wash_station_id: station.id,
                opening_time: defaultRule.opening_time,
                closing_time: defaultRule.closing_time,
                slot_duration_minutes: defaultRule.slot_duration_minutes,
                is_closed: false,
              };

              await this.create(newAvailabilityDto as CreateAvailabilityDto, user_id);
            } catch (createError) {
              console.error(`Error auto-creating availability for station ${station.id}:`, createError);
              // Continue with other stations if one fails
            }
          }
        }
      }

      const carWashStations = await this.prisma.carWashStation.findMany({
        where: {
          ...stationOwnerFilter,
          availabilities: {
            some: {
              date: todayISOString,
              is_closed: false, // Only show open stations
            },
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          rating: true,
          location: true,
          latitude: true,
          longitude: true,
          created_at: true,
          availabilities: {
            where: {
              date: todayISOString,
              is_closed: false,
            },
            select: {
              id: true,
              day: true,
              date: true,
              opening_time: true,
              closing_time: true,
              slot_duration_minutes: true,
              time_slots: {
                where: {
                  is_blocked: false, // Only show unblocked slots
                },
                select: {
                  id: true,
                  start_time: true,
                  end_time: true,
                  capacity: true,
                  is_blocked: true,
                  block_reason: true,
                },
              },
            },
          },
        },
      });

      // Add file URLs
      if (carWashStations && carWashStations.length > 0) {
        for (const record of carWashStations) {
          if (record.image) {
            record['image_url'] = SojebStorage.url(
              appConfig().storageUrl.carWashStation + record.image,
            );
          }
        }
      }

      // Get user information and recent booking history if user_id is provided
      let userInfo = null;
      let recentBookings = null;

      if (user_id) {
        try {
          // Get user information
          userInfo = await this.prisma.user.findUnique({
            where: { id: user_id },
            select: {
              id: true,
              name: true,
              first_name: true,
              last_name: true,
              email: true,
              phone_number: true,
              avatar: true,
              created_at: true,
            },
          });

          // Add user avatar URL if available
          if (userInfo && userInfo.avatar) {
            userInfo['avatar_url'] = SojebStorage.url(
              appConfig().storageUrl.avatar + userInfo.avatar,
            );
          }

          // Get recent booking history (last 5 bookings)
          recentBookings = await this.prisma.booking.findMany({
            where: { user_id: user_id },
            orderBy: { created_at: 'desc' },
            take: 5,
            select: {
              id: true,
              carType: true,
              bookingDate: true,
              status: true,
              payment_status: true,
              total_amount: true,
              created_at: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  image: true,
                },
              },
              car_wash_station: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                  image: true,
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

          // Add service and station image URLs
          if (recentBookings && recentBookings.length > 0) {
            for (const booking of recentBookings) {
              if (booking.service.image) {
                booking.service['image_url'] = SojebStorage.url(
                  appConfig().storageUrl.service + booking.service.image,
                );
              }
              if (booking.car_wash_station.image) {
                booking.car_wash_station['image_url'] = SojebStorage.url(
                  appConfig().storageUrl.carWashStation + booking.car_wash_station.image,
                );
              }
            }
          }
        } catch (userError) {
          console.error('Error fetching user information:', userError);
          // Continue without user info if there's an error
        }
      }

      return {
        success: true,
        message: carWashStations.length
          ? 'Available car wash stations for today retrieved successfully'
          : 'No car wash stations available today',
        data: {
          user: userInfo,
          stations: carWashStations,
          recent_bookings: recentBookings,
        },
        auto_creation_attempted: !!user_id,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching available car wash stations: ${error.message}`,
      };
    }
  }

  async findOne(id: string) {
    try {
      const availability = await this.prisma.availability.findUnique({
        where: { id },
        select: {
          id: true,
          user_id: true,
          day: true,
          date: true,
          opening_time: true,
          closing_time: true,
          slot_duration_minutes: true,
          is_closed: true,
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
          car_wash_station: {
            select: {
              id: true,
              name: true,
            },
          },
          time_slots: {
            select: {
              id: true,
              start_time: true,
              end_time: true,
              capacity: true,
              is_blocked: true,
              block_reason: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      });
      // Add user image URL if available
      if (availability && availability.user && availability.user.avatar) {
        availability.user['image_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + availability.user.avatar,
        );
      }
      return {
        success: true,
        message:
          availability != null
            ? 'Availability retrieved successfully'
            : 'Availability not found',
        data: availability,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching availability: ${error.message}`,
      };
    }
  }

  async getAvailableTimeSlots(bookingDate: string, carWashStationId: string, user_id: string, page: number = 1, limit: number = 50) {
    try {
      const requestedDate = new Date(bookingDate);
      const requestedDay = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const startOfDay = new Date(requestedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(requestedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // First, check if availability exists for this date
      const existingAvailability = await this.prisma.availability.findFirst({
        where: {
          car_wash_station_id: carWashStationId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      // If no availability exists and user_id is provided, create one automatically
      if (!existingAvailability && user_id) {
        try {
          // Try to get default settings from an existing availability rule
          const defaultRule = await this.prisma.availabilityRule.findFirst({
            where: { car_wash_station_id: carWashStationId },
            orderBy: { created_at: 'desc' },
            select: { opening_time: true, closing_time: true, slot_duration_minutes: true, days_open: true },
          });

          if (!defaultRule) {
            // No rule configured; skip auto-creation
          } else {
            // Validate requested day against rule
            const dayEnum = AvailabilityHelper.convertDayNameToEnum(requestedDay.toUpperCase());
            if (defaultRule.days_open.includes(dayEnum)) {
              // Create new availability using the create method with rule settings
              const newAvailabilityDto = {
                date: requestedDate.toISOString(),
                car_wash_station_id: carWashStationId,
                opening_time: defaultRule.opening_time,
                closing_time: defaultRule.closing_time,
                slot_duration_minutes: defaultRule.slot_duration_minutes,
                is_closed: false,
              };

              const createResult = await this.create(newAvailabilityDto as CreateAvailabilityDto, user_id);

              if (createResult.success) {
                // Now fetch the newly created time slots
                return await this.getAvailableTimeSlots(bookingDate, carWashStationId, user_id, page, limit);
              }
            } // else day closed, skip auto-creation
          }
        } catch (createError) {
          console.error('Error auto-creating availability:', createError);
          // Continue with the original logic if auto-creation fails
        }
      }

      // Get all time slots for the car wash station on the requested day
      const availableTimeSlots = await this.prisma.timeSlot.findMany({
        where: {
          availability: {
            car_wash_station_id: carWashStationId,
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
            is_closed: false, // Only show open days
          },
          is_blocked: false, // Only show unblocked slots
        },
        include: {
          availability: {
            select: {
              date: true,
              day: true,
              opening_time: true,
              closing_time: true,
              slot_duration_minutes: true,
            }
          }
        },
        orderBy: {
          start_time: 'asc'
        }
      });

      if (availableTimeSlots.length === 0) {
        return {
          success: false,
          message: `No time slots available for ${requestedDay} at this car wash station.`,
          data: {
            id: existingAvailability?.id,
            requested_date: requestedDate,
            day_of_week: requestedDay,
            available_slots: [],
            auto_creation_attempted: !!user_id
          }
        };
      }

      // Check which time slots are already booked
      const bookedTimeSlots = await this.prisma.booking.findMany({
        where: {
          car_wash_station_id: carWashStationId,
          bookingDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: {
            notIn: ['cancelled', 'rejected']
          }
        },
        select: {
          time_slot_id: true,
          status: true,
          bookingDate: true,
        }
      });

      const bookedTimeSlotIds = bookedTimeSlots.map(booking => booking.time_slot_id);

      // Filter out booked time slots
      const freeTimeSlots = availableTimeSlots.filter(
        timeSlot => !bookedTimeSlotIds.includes(timeSlot.id)
      );

      // Apply pagination to free time slots
      const skip = (page - 1) * limit;
      const paginatedSlots = freeTimeSlots.slice(skip, skip + limit);
      const total = freeTimeSlots.length;
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        success: true,
        message: `Found ${freeTimeSlots.length} available time slots for ${requestedDay}`,
        data: {
          id: existingAvailability?.id,
          requested_date: requestedDate,
          day_of_week: requestedDay,
          total_available_slots: availableTimeSlots.length,
          booked_slots: bookedTimeSlots.length,
          available_slots: paginatedSlots.map(slot => ({
            id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            capacity: slot.capacity,
            is_available: true
          })),
          booked_slots_details: bookedTimeSlots.map(booking => ({
            time_slot_id: booking.time_slot_id,
            status: booking.status,
            booking_date: booking.bookingDate
          })),
          auto_created: !existingAvailability && availableTimeSlots.length > 0
        },
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting available time slots: ${error.message}`,
      };
    }
  }

  async update(id: string, updateAvailabilityDto: UpdateAvailabilityDto) {
    try {
      // Ensure date is properly formatted for Prisma
      if (updateAvailabilityDto.date) {
        try {
          updateAvailabilityDto.date = AvailabilityHelper.formatDateForPrisma(updateAvailabilityDto.date);
        } catch (error) {
          return {
            success: false,
            message: `Invalid date format: ${updateAvailabilityDto.date}. Please use ISO-8601 format (e.g., '2024-01-01' or '2024-01-01T00:00:00.000Z')`,
          };
        }
      }

      // Use transaction to update availability and regenerate time slots
      const result = await this.prisma.$transaction(async (prisma) => {
        // Update availability first
        const availability = await prisma.availability.update({
          where: { id },
          data: updateAvailabilityDto,
          select: {
            id: true,
            user_id: true,
            day: true,
            date: true,
            opening_time: true,
            closing_time: true,
            slot_duration_minutes: true,
            is_closed: true,
            created_at: true,
            updated_at: true,
            user: true,
            time_slots: {
              select: {
                id: true,
                start_time: true,
                end_time: true,
                availability_id: true,
                capacity: true,
                is_blocked: true,
                block_reason: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        });

        // Regenerate time slots automatically if opening_time, closing_time, and slot_duration_minutes are provided
        if (availability.opening_time && availability.closing_time && availability.slot_duration_minutes) {
          // Delete existing time slots
          await prisma.timeSlot.deleteMany({
            where: { availability_id: id },
          });

          // Generate new time slots
          const generatedTimeSlots = AvailabilityHelper.generateTimeSlots(
            availability.opening_time,
            availability.closing_time,
            availability.slot_duration_minutes,
            availability.id
          );

          if (generatedTimeSlots.length > 0) {
            await prisma.timeSlot.createMany({
              data: generatedTimeSlots,
            });

            // Fetch the updated time slots
            const updatedTimeSlots = await prisma.timeSlot.findMany({
              where: { availability_id: id },
              select: {
                id: true,
                start_time: true,
                end_time: true,
                availability_id: true,
                capacity: true,
                is_blocked: true,
                block_reason: true,
                created_at: true,
                updated_at: true,
              },
            });

            // Update the availability object to include time slots
            availability.time_slots = updatedTimeSlots;
          }
        }

        return availability;
      });

      return {
        success: true,
        message: 'Availability updated successfully with regenerated time slots',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating availability: ${error.message}`,
      };
    }
  }

  async remove(id: string) {
    try {
      // Use transaction to delete availability and associated time slots
      await this.prisma.$transaction(async (prisma) => {
        // Delete associated time slots first
        await prisma.timeSlot.deleteMany({
          where: { availability_id: id },
        });

        // Then delete the availability
        await prisma.availability.delete({
          where: { id },
        });
      });

      return {
        success: true,
        message: 'Availability deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error deleting availability: ${error.message}`,
      };
    }
  }


  async createAvailabilityRule(createAvailabilityRuleDto: CreateAvailabilityRuleDto, user_id: string) {
    try {

      if (!createAvailabilityRuleDto.car_wash_station_id) {
        const carWashStation = await this.prisma.carWashStation.findFirst({
          where: {
            user_id: user_id,
          },
        });

        createAvailabilityRuleDto.car_wash_station_id = carWashStation.id;
      }


      // check availability rule if already exists
      const availabilityRule = await this.prisma.availabilityRule.findFirst({
        where: {
          car_wash_station_id: createAvailabilityRuleDto.car_wash_station_id,
        },
      });

      if (availabilityRule) {
        return {
          success: false,
          message: 'Availability rule already exists',
        };
      }

      const newAvailabilityRule = await this.prisma.availabilityRule.create({
        data: {
          car_wash_station_id: createAvailabilityRuleDto.car_wash_station_id,
          opening_time: createAvailabilityRuleDto.opening_time,
          closing_time: createAvailabilityRuleDto.closing_time,
          slot_duration_minutes: createAvailabilityRuleDto.slot_duration_minutes,
          days_open: createAvailabilityRuleDto.days_open,
          user_id: user_id,
        },
        select: {
          id: true,
          user_id: true,
          car_wash_station_id: true,
          opening_time: true,
          closing_time: true,
          slot_duration_minutes: true,
          days_open: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          car_wash_station: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Availability rule created successfully',
        data: newAvailabilityRule,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating availability rule: ${error.message}`,
      };
    }
  }

  /**
   * Generate availabilities from a rule for a date range
   */
  async generateAvailabilityFromRule(generateDto: GenerateAvailabilityFromRuleDto, user_id: string, ruleId: string) {
    try {
      // Get the rule
      const rule = await this.prisma.availabilityRule.findUnique({
        where: { id: ruleId },
        select: {
          id: true,
          car_wash_station_id: true,
          opening_time: true,
          closing_time: true,
          slot_duration_minutes: true,
          days_open: true,
        },
      });

      if (!rule) {
        return {
          success: false,
          message: 'Availability rule not found',
        };
      }

      // Check if user owns the rule
      const ruleOwner = await this.prisma.availabilityRule.findFirst({
        where: {
          id: ruleId,
          user_id: user_id,
        },
      });

      if (!ruleOwner) {
        return {
          success: false,
          message: 'You can only generate availabilities from your own rules',
        };
      }

      const startDate = new Date(generateDto.start_date);
      const endDate = new Date(generateDto.end_date);
      const generatedAvailabilities = [];
      const errors = [];

      // Use transaction to create all availabilities
      await this.prisma.$transaction(async (prisma) => {
        for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
          try {
            const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

            // Convert day name to enum format (e.g., 'MONDAY' -> 2)
            const dayEnum = AvailabilityHelper.convertDayNameToEnum(dayOfWeek);

            // Check if this day is open according to the rule
            if (!rule.days_open.includes(dayEnum)) {
              continue; // Skip closed days
            }

            const dateString = currentDate.toISOString().split('T')[0];

            // Check if availability already exists for this date
            if (!generateDto.overwrite_existing) {
              const existingAvailability = await prisma.availability.findFirst({
                where: {
                  date: {
                    gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                    lt: new Date(currentDate.setHours(23, 59, 59, 999)),
                  },
                  car_wash_station_id: rule.car_wash_station_id,
                },
              });

              if (existingAvailability) {
                continue; // Skip if already exists and not overwriting
              }
            }

            // Create availability
            const availability = await prisma.availability.create({
              data: {
                date: currentDate,
                day: dayOfWeek,
                car_wash_station_id: rule.car_wash_station_id,
                user_id: user_id,
                opening_time: rule.opening_time,
                closing_time: rule.closing_time,
                slot_duration_minutes: rule.slot_duration_minutes,
                is_closed: false,
              },
              select: {
                id: true,
                date: true,
                day: true,
                opening_time: true,
                closing_time: true,
                slot_duration_minutes: true,
              },
            });

            // Generate time slots automatically
            const generatedTimeSlots = AvailabilityHelper.generateTimeSlots(
              availability.opening_time,
              availability.closing_time,
              availability.slot_duration_minutes,
              availability.id
            );

            if (generatedTimeSlots.length > 0) {
              await prisma.timeSlot.createMany({
                data: generatedTimeSlots,
              });
            }

            generatedAvailabilities.push({
              ...availability,
              time_slots_count: generatedTimeSlots.length,
            });

          } catch (error) {
            errors.push({
              date: currentDate.toISOString().split('T')[0],
              error: error.message,
            });
          }
        }
      });

      return {
        success: true,
        message: `Generated ${generatedAvailabilities.length} availabilities from rule`,
        data: {
          generated_count: generatedAvailabilities.length,
          errors_count: errors.length,
          generated_availabilities: generatedAvailabilities,
          errors: errors,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating availabilities from rule: ${error.message}`,
      };
    }
  }

  async getAvailabilityRules(carWashStationId: string, page: number = 1, limit: number = 50) {
    try {
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const total = await this.prisma.availabilityRule.count({
        where: { car_wash_station_id: carWashStationId },
      });

      // Get paginated results
      const rules = await this.prisma.availabilityRule.findMany({
        where: { car_wash_station_id: carWashStationId },
        skip,
        take: limit,
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
      });

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        success: true,
        message: 'Availability rules retrieved successfully',
        data: rules,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching availability rules: ${error.message}`,
      };
    }
  }

  async deleteAvailabilityRule(ruleId: string, user_id: string) {
    try {
      // Check if user owns the rule
      const rule = await this.prisma.availabilityRule.findFirst({
        where: {
          id: ruleId,
          user_id: user_id,
        },
      });

      if (!rule) {
        return {
          success: false,
          message: 'Availability rule not found or you do not have permission to delete it',
        };
      }

      await this.prisma.availabilityRule.delete({
        where: { id: ruleId },
      });

      return {
        success: true,
        message: 'Availability rule deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error deleting availability rule: ${error.message}`,
      };
    }
  }

  async updateAvailabilityRule(ruleId: string, body: Partial<CreateAvailabilityRuleDto>, user_id: string) {
    try {
      // Validate ownership
      const existingRule = await this.prisma.availabilityRule.findFirst({
        where: { id: ruleId, user_id },
        select: {
          id: true,
          car_wash_station_id: true,
          opening_time: true,
          closing_time: true,
          slot_duration_minutes: true,
          days_open: true,
        },
      });

      if (!existingRule) {
        return {
          success: false,
          message: 'Availability rule not found or you do not have permission to update it',
        };
      }

      // Normalize optional days_open if provided (convert full names to enum codes)
      let nextDaysOpen = existingRule.days_open;
      if (Array.isArray(body.days_open) && body.days_open.length > 0) {
        nextDaysOpen = body.days_open.map((d: any) => AvailabilityHelper.convertDayNameToEnum(String(d).toUpperCase()));
      }

      // Update the rule
      const updatedRule = await this.prisma.availabilityRule.update({
        where: { id: ruleId },
        data: {
          opening_time: body.opening_time ?? existingRule.opening_time,
          closing_time: body.closing_time ?? existingRule.closing_time,
          slot_duration_minutes: body.slot_duration_minutes ?? existingRule.slot_duration_minutes,
          days_open: nextDaysOpen,
        },
        select: {
          id: true,
          car_wash_station_id: true,
          opening_time: true,
          closing_time: true,
          slot_duration_minutes: true,
          days_open: true,
        },
      });

      // Reconcile existing availabilities and time slots for this station
      const stationId = updatedRule.car_wash_station_id;
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      await this.prisma.$transaction(async (prisma) => {
        const availabilities = await prisma.availability.findMany({
          where: {
            car_wash_station_id: stationId,
            date: { gte: startOfToday },
          },
          select: {
            id: true,
            day: true,
            date: true,
            opening_time: true,
            closing_time: true,
            slot_duration_minutes: true,
          },
        });

        for (const availability of availabilities) {
          const dayEnum = AvailabilityHelper.convertDayNameToEnum(String(availability.day).toUpperCase());

          // Find booked slots for this availability
          const booked = await prisma.booking.findMany({
            where: {
              time_slot: { availability_id: availability.id },
              status: { notIn: ['cancelled', 'rejected'] },
            },
            select: { time_slot_id: true },
          });
          const bookedSlotIds = booked.map((b) => b.time_slot_id);

          // Delete all unbooked time slots for this availability
          await prisma.timeSlot.deleteMany({
            where: {
              availability_id: availability.id,
              id: { notIn: bookedSlotIds.length ? bookedSlotIds : [''] },
            },
          });

          const isOpenDay = updatedRule.days_open.includes(dayEnum);

          if (!isOpenDay) {
            // If no booked slots remain, delete the availability entirely; else mark closed
            if (bookedSlotIds.length === 0) {
              await prisma.availability.delete({ where: { id: availability.id } });
              continue;
            } else {
              await prisma.availability.update({
                where: { id: availability.id },
                data: { is_closed: true },
              });
              continue;
            }
          }

          // For open day: update availability snapshot to rule values
          const newOpening = updatedRule.opening_time;
          const newClosing = updatedRule.closing_time;
          const newDuration = updatedRule.slot_duration_minutes;

          await prisma.availability.update({
            where: { id: availability.id },
            data: {
              opening_time: newOpening,
              closing_time: newClosing,
              slot_duration_minutes: newDuration,
              is_closed: false,
            },
          });

          // Generate new grid and create slots, excluding overlaps with existing booked slot times
          const generated = AvailabilityHelper.generateTimeSlots(
            newOpening,
            newClosing,
            newDuration,
            availability.id,
          );

          // Avoid creating duplicates by unique constraint; keep booked slots as-is
          if (generated.length > 0) {
            await prisma.timeSlot.createMany({ data: generated, skipDuplicates: true as any });
          }
        }
      });

      return {
        success: true,
        message: 'Availability rule updated and schedules reconciled successfully',
        data: updatedRule,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating availability rule: ${error.message}`,
      };
    }
  }
}
