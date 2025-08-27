import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAvailabilityDto, CreateBulkAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) { }

  async create(createAvailabilityDto: CreateAvailabilityDto, user_id: string) {
    try {
      // Extract time slots data from DTO
      const { timeSlots, ...availabilityData } = createAvailabilityDto;

      // Ensure date is properly formatted for Prisma
      if (availabilityData.date) {
        try {
          availabilityData.date = new Date(availabilityData.date).toISOString();
          availabilityData.day = new Date(availabilityData.date).toLocaleDateString('en-US', { weekday: 'long' });
        } catch (error) {
          return {
            success: false,
            message: `Invalid date format: ${availabilityData.date}. Please use ISO-8601 format (e.g., '2024-01-01' or '2024-01-01T00:00:00.000Z')`,
          };
        }
      }

      // Use transaction to create availability and time slots together
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create availability first
        const availability = await prisma.availability.create({
          data: { ...availabilityData, user_id },
          select: {
            id: true,
            user_id: true,
            day: true,
            date: true,
            car_wash_station_id: true,
            createdAt: true,
            updatedAt: true,
            time_slots: {
              select: {
                id: true,
                start_time: true,
                end_time: true,
                availability_id: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

        // Create time slots if provided
        if (timeSlots && timeSlots.length > 0) {
          const timeSlotData = timeSlots.map(timeSlot => ({
            start_time: timeSlot.start_time,
            end_time: timeSlot.end_time,
            availability_id: availability.id,
          }));

          await prisma.timeSlot.createMany({
            data: timeSlotData,
          });

          // Fetch the created time slots
          const createdTimeSlots = await prisma.timeSlot.findMany({
            where: { availability_id: availability.id },
            select: {
              id: true,
              start_time: true,
              end_time: true,
              availability_id: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          // Update the availability object to include time slots
          availability.time_slots = createdTimeSlots;
        }

        return availability;
      });

      return {
        success: true,
        message: 'Availability created successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating availability: ${error.message}`,
      };
    }
  }

  async createBulk(createBulkAvailabilityDto: CreateBulkAvailabilityDto, user_id: string) {
    try {
      const { availabilities } = createBulkAvailabilityDto;
      const results = [];
      const errors = [];

      // Use transaction to create all availabilities and time slots together
      const result = await this.prisma.$transaction(async (prisma) => {
        for (const availabilityDto of availabilities) {
          try {
            const { timeSlots, ...availabilityData } = availabilityDto;

            // Ensure date is properly formatted for Prisma
            if (availabilityData.date) {
              try {
                availabilityData.date = new Date(availabilityData.date).toISOString();
                availabilityData.day = new Date(availabilityData.date).toLocaleDateString('en-US', { weekday: 'long' });
              } catch (error) {
                errors.push({
                  data: availabilityDto,
                  error: `Invalid date format: ${availabilityData.date}. Please use ISO-8601 format (e.g., '2024-01-01' or '2024-01-01T00:00:00.000Z')`,
                });
                continue; // Skip this availability and continue with the next one
              }
            }

            // Create availability first
            const availability = await prisma.availability.create({
              data: { ...availabilityData, user_id },
              select: {
                id: true,
                user_id: true,
                day: true,
                date: true,
                car_wash_station_id: true,
                createdAt: true,
                updatedAt: true,
                user: true,
                time_slots: {
                  select: {
                    id: true,
                    start_time: true,
                    end_time: true,
                    availability_id: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            });

            // Create time slots if provided
            if (timeSlots && timeSlots.length > 0) {
              const timeSlotData = timeSlots.map(timeSlot => ({
                start_time: timeSlot.start_time,
                end_time: timeSlot.end_time,
                availability_id: availability.id,
              }));

              await prisma.timeSlot.createMany({
                data: timeSlotData,
              });

              // Fetch the created time slots
              const createdTimeSlots = await prisma.timeSlot.findMany({
                where: { availability_id: availability.id },
                select: {
                  id: true,
                  start_time: true,
                  end_time: true,
                  availability_id: true,
                  createdAt: true,
                  updatedAt: true,
                },
              });

              // Update the availability object to include time slots
              availability.time_slots = createdTimeSlots;
            }

            results.push(availability);
          } catch (error) {
            errors.push({
              error: error.message,
            });
          }
        }

        return { results, errors };
      });

      const { results: createdAvailabilities, errors: creationErrors } = result;
      console.log(errors)

      return {
        success: true,
        message: `Bulk availability creation completed. ${createdAvailabilities.length} created successfully, ${creationErrors.length} failed.`,
        data: createdAvailabilities.length > 0 ? createdAvailabilities : creationErrors
      };
    } catch (error) {
      return {
        success: false,
        message: `Error in bulk availability creation: ${error.message}`,
      };
    }
  }

  async findAll(searchQuery: string | null) {
    try {
      const whereClause = {};
      if (searchQuery) {
        whereClause['OR'] = [
          { day: { contains: searchQuery, mode: 'insensitive' } },
          { user_id: { contains: searchQuery, mode: 'insensitive' } },
        ];
      }
      const availabilities = await this.prisma.availability.findMany({
        where: whereClause,
        select: {
          id: true,
          user_id: true,
          day: true,
          date: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true, // Assuming user has an avatar field
            },
          },
          time_slots: {
            select: {
              id: true,
              start_time: true,
              end_time: true,
            },
          },
          car_wash_station_id: true,
        },
      });

      //add user image
      availabilities.forEach((availability) => {
        if (availability.user && availability.user.avatar) {
          availability.user['image_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar + availability.user.avatar,
          );
        }
      });

      return {
        success: true,
        message:
          availabilities.length > 0
            ? 'Availabilities retrieved successfully'
            : 'No availabilities found',
        data: availabilities,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching availabilities: ${error.message}`,
      };
    }
  }

  async availableToday() {
    try {
      // Get today's date in ISO format, ensuring the time portion is set to midnight (UTC)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);  // Set time to 00:00:00.000 UTC
      const todayISOString = today.toISOString();  // This will return the full ISO string (with time)

      const carWashStations = await this.prisma.carWashStation.findMany({
        where: {
          availabilities: {
            some: {
              date: todayISOString,
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
          createdAt: true,
          availabilities: {
            where: {
              date: todayISOString,
            },
            select: {
              id: true,
              day: true,
              date: true,
              time_slots: {
                select: {
                  id: true,
                  start_time: true,
                  end_time: true,
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

      return {
        success: true,
        message: carWashStations.length
          ? 'Available car wash stations for today retrieved successfully'
          : 'No car wash stations available today',
        data: carWashStations,
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
          car_wash_station: {
            select: {
              id: true,
              name: true,
            },
          },
          time_slots: true,
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

  /**
  * Get available time slots for a specific date and car wash station
  */
  async getAvailableTimeSlots(bookingDate: string, carWashStationId: string) {
    try {
      const requestedDate = new Date(bookingDate);
      const requestedDay = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const startOfDay = new Date(requestedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(requestedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all time slots for the car wash station on the requested day
      const availableTimeSlots = await this.prisma.timeSlot.findMany({
        where: {
          availability: {
            car_wash_station_id: carWashStationId,
            day: requestedDay
          }
        },
        include: {
          availability: {
            select: {
              date: true,
              day: true
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
            requested_date: requestedDate,
            day_of_week: requestedDay,
            available_slots: []
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

      return {
        success: true,
        message: `Found ${freeTimeSlots.length} available time slots for ${requestedDay}`,
        data: {
          requested_date: requestedDate,
          day_of_week: requestedDay,
          total_available_slots: availableTimeSlots.length,
          booked_slots: bookedTimeSlots.length,
          available_slots: freeTimeSlots.map(slot => ({
            id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_available: true
          })),
          booked_slots_details: bookedTimeSlots.map(booking => ({
            time_slot_id: booking.time_slot_id,
            status: booking.status,
            booking_date: booking.bookingDate
          }))
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
      // Extract time slots data from DTO
      const { timeSlots, ...availabilityData } = updateAvailabilityDto;

      // Ensure date is properly formatted for Prisma
      if (availabilityData.date) {
        try {
          availabilityData.date = new Date(availabilityData.date).toISOString();
        } catch (error) {
          return {
            success: false,
            message: `Invalid date format: ${availabilityData.date}. Please use ISO-8601 format (e.g., '2024-01-01' or '2024-01-01T00:00:00.000Z')`,
          };
        }
      }

      // Use transaction to update availability and time slots together
      const result = await this.prisma.$transaction(async (prisma) => {
        // Update availability first
        const availability = await prisma.availability.update({
          where: { id },
          data: availabilityData,
          select: {
            id: true,
            user_id: true,
            day: true,
            date: true,
            createdAt: true,
            updatedAt: true,
            user: true,
            time_slots: {
              select: {
                id: true,
                start_time: true,
                end_time: true,
                availability_id: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

        // Handle time slots if provided
        if (timeSlots && timeSlots.length > 0) {
          // Delete existing time slots
          await prisma.timeSlot.deleteMany({
            where: { availability_id: id },
          });

          // Create new time slots
          const timeSlotData = timeSlots.map(timeSlot => ({
            start_time: timeSlot.start_time,
            end_time: timeSlot.end_time,
            availability_id: id,
          }));

          await prisma.timeSlot.createMany({
            data: timeSlotData,
          });

          // Fetch the updated time slots
          const updatedTimeSlots = await prisma.timeSlot.findMany({
            where: { availability_id: id },
            select: {
              id: true,
              start_time: true,
              end_time: true,
              availability_id: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          // Update the availability object to include time slots
          availability.time_slots = updatedTimeSlots;
        }

        return availability;
      });

      return {
        success: true,
        message: 'Availability updated successfully',
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
}
