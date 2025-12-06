import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCarWashStationDto } from './dto/create-car-wash-station.dto';
import { UpdateCarWashStationDto } from './dto/update-car-wash-station.dto';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { StringHelper } from 'src/common/helper/string.helper';
import { date } from 'zod';

interface FindAllParams {
  searchQuery?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  order?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CarWashStationService {
  constructor(private prisma: PrismaService) {}

  // Helper function to calculate distance between two coordinates using Haversine formula
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async create(
    createCarWashStationDto: CreateCarWashStationDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    try {
      if (file) {
        const fileName = StringHelper.generateRandomFileName(file.originalname);
        await SojebStorage.put(
          appConfig().storageUrl.carWashStation + fileName,
          file.buffer,
        );
        createCarWashStationDto.image = fileName; // Add image to DTO if not present
      }

      const existing = await this.prisma.carWashStation.findUnique({
        where: { user_id: userId },
      });

      if (existing) {
        return {
          message: 'You already created a car wash station.',
          stationId: existing.id,
        };
      }

      const carWashStation = await this.prisma.carWashStation.create({
        data: {
          ...createCarWashStationDto,
          user_id: userId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          pricePerWash: true,
          location: true,
          latitude: true,
          phone_number: true,
          longitude: true,
          created_at: true,
        },
      });

      return {
        success: true,
        message: 'Car wash station created successfully',
        data: carWashStation,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating car wash station: ${error.message}`,
      };
    }
  }

  async findAll(params: FindAllParams) {
    try {
      const { searchQuery, lat, lng, radius, order, page, limit } = params;

      const whereClause = {};
      if (searchQuery) {
        whereClause['OR'] = [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination
      const total = await this.prisma.carWashStation.count({
        where: whereClause,
      });

      // Calculate pagination values
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;
      const skip = (page - 1) * limit;

      let carWashStations = await this.prisma.carWashStation.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          rating: true,
          reviewCount: true,
          pricePerWash: true,
          location: true,
          latitude: true,
          longitude: true,
          created_at: true,
        },
        skip: skip,
        take: limit,
      });

      // Add file URLs and calculate distance if coordinates provided
      if (carWashStations && carWashStations.length > 0) {
        for (const record of carWashStations) {
          if (record.image) {
            record['image_url'] = SojebStorage.url(
              appConfig().storageUrl.carWashStation + record.image,
            );
          }

          // Calculate distance if user coordinates are provided
          if (
            lat !== null &&
            lng !== null &&
            record.latitude &&
            record.longitude
          ) {
            const distance = this.calculateDistance(
              lat,
              lng,
              record.latitude,
              record.longitude,
            );
            record['distance'] = distance;
            record['distanceUnit'] = 'km';
          }
        }

        // Sort by distance if coordinates provided and order is 'distance'
        if (lat !== null && lng !== null && order === 'distance') {
          carWashStations = carWashStations.sort(
            (a, b) => (a['distance'] || 0) - (b['distance'] || 0),
          );
        }

        // Filter by radius if coordinates and radius provided
        if (lat !== null && lng !== null && radius) {
          carWashStations = carWashStations.filter((station) => {
            return !station['distance'] || station['distance'] <= radius;
          });
        }
      }

      return {
        success: true,
        message: carWashStations.length
          ? 'Car wash stations retrieved successfully'
          : 'No car wash stations found',
        data: carWashStations,
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
        message: `Error fetching car wash stations: ${error.message}`,
      };
    }
  }

  async findByUserId(userId: string) {
    try {
      const carWashStation = await this.prisma.carWashStation.findUnique({
        where: { user_id: userId },
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          pricePerWash: true,
          location: true,
          latitude: true,
          longitude: true,
          phone_number: true,
          rating: true,
          reviewCount: true,
          status: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              phone_number: true,
            },
          },
          services: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              image: true,
              status: true,
              created_at: true,
            },
          },
          availability_rules: {
            select: {
              id: true,
              opening_time: true,
              closing_time: true,
              slot_duration_minutes: true,
              days_open: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      });

      if (carWashStation && carWashStation.image) {
        carWashStation['image_url'] = SojebStorage.url(
          appConfig().storageUrl.carWashStation + carWashStation.image,
        );
      }

      if (carWashStation && carWashStation.user && carWashStation.user.avatar) {
        carWashStation.user['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + carWashStation.user.avatar,
        );
      }

      if (carWashStation && carWashStation.services && carWashStation.services.length > 0) {
        for (const service of carWashStation.services) {
          if (service.image) {
            service['image_url'] = SojebStorage.url(
              appConfig().storageUrl.service + service.image,
            );
          }
        }
      }

      return {
        success: true,
        message: carWashStation
          ? 'Car wash station retrieved successfully'
          : 'No car wash station found for this user',
        data: carWashStation,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching car wash station: ${error.message}`,
      };
    }
  }

  async findOne(id: string) {
    try {
      // Get today's date in ISO format, ensuring the time portion is set to midnight (UTC)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Set time to 00:00:00.000 UTC
      const todayISOString = today.toISOString(); // This will return the full ISO string (with time)

      const carWashStation = await this.prisma.carWashStation.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          pricePerWash: true,
          location: true,
          latitude: true,
          longitude: true,
          rating: true,
          reviewCount: true,
          created_at: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          services: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
            },
          },
          availabilities: {
            where: {
              date: todayISOString, // Use the full ISO DateTime format for today
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
          reviews: {
            select: {
              id: true,
              rating: true,
              comment: true,
            },
          },
        },
      });

      if (carWashStation && carWashStation.image) {
        carWashStation['image_url'] = SojebStorage.url(
          appConfig().storageUrl.carWashStation + carWashStation.image,
        );
      }
      if (carWashStation && carWashStation.user && carWashStation.user.avatar) {
        carWashStation.user['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + carWashStation.user.avatar,
        );
        if (carWashStation.services && carWashStation.services.length > 0) {
          for (const service of carWashStation.services) {
            if (service.image) {
              service['image_url'] = SojebStorage.url(
                appConfig().storageUrl.service + service.image,
              );
            }
          }
        }
      }

      return {
        success: true,
        message: carWashStation
          ? 'Car wash station retrieved successfully'
          : 'Car wash station not found',
        data: carWashStation,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching car wash station: ${error.message}`,
      };
    }
  }

  async update(
    id: string,
    updateCarWashStationDto: UpdateCarWashStationDto,
    file: Express.Multer.File,
  ) {
    try {
      let image = updateCarWashStationDto.image;

      // If a new file is uploaded, handle it
      if (file) {
        // Check if there's an old image to delete
        if (image) {
          await SojebStorage.delete(
            appConfig().storageUrl.carWashStation + image,
          ); // Delete the old file
        }

        const fileName = StringHelper.generateRandomFileName(file.originalname);
        await SojebStorage.put(
          appConfig().storageUrl.carWashStation + fileName,
          file.buffer,
        );
        image = fileName; // Set the uploaded image file
      }

      const carWashStation = await this.prisma.carWashStation.update({
        where: { id },
        data: {
          ...updateCarWashStationDto,
          image, // Include the image in the update
        },
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          pricePerWash: true,
          location: true,
          latitude: true,
          longitude: true,
          created_at: true,
        },
      });

      return {
        success: true,
        message: 'Car wash station updated successfully',
        data: carWashStation,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating car wash station: ${error.message}`,
      };
    }
  }

  async remove(id: string) {
    try {
      const carWashStation = await this.prisma.carWashStation.findUnique({
        where: { id },
        select: {
          id: true,
          image: true,
        },
      });

      if (carWashStation && carWashStation.image) {
        await SojebStorage.delete(
          appConfig().storageUrl.carWashStation + carWashStation.image,
        );
      }

      // Now, delete the car wash station record
      await this.prisma.carWashStation.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Car wash station deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error deleting car wash station: ${error.message}`,
      };
    }
  }
}
