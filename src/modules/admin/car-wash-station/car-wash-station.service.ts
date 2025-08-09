import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCarWashStationDto } from './dto/create-car-wash-station.dto';
import { UpdateCarWashStationDto } from './dto/update-car-wash-station.dto';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { StringHelper } from 'src/common/helper/string.helper';

@Injectable()
export class CarWashStationService {
  constructor(private prisma: PrismaService) { }

  async create(createCarWashStationDto: CreateCarWashStationDto, file: Express.Multer.File) {
    try {
      if (file) {
        const fileName = StringHelper.generateRandomFileName(file.originalname);
        await SojebStorage.put(appConfig().storageUrl.carWashStation + fileName, file.buffer);
        createCarWashStationDto.image = fileName; // Add image to DTO if not present
      }

      const carWashStation = await this.prisma.carWashStation.create({
        data: {
          ...createCarWashStationDto,
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
          createdAt: true,
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

  async findAll(searchQuery: string | null) {
    try {
      const whereClause = {};
      if (searchQuery) {
        whereClause['OR'] = [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ];
      }

      const carWashStations = await this.prisma.carWashStation.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          pricePerWash: true,
          location: true,
          latitude: true,
          longitude: true,
          createdAt: true,
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
          ? 'Car wash stations retrieved successfully'
          : 'No car wash stations found',
        data: carWashStations,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching car wash stations: ${error.message}`,
      };
    }
  }

  async findOne(id: string) {
    try {
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
          createdAt: true,
        },
      });

      if (carWashStation && carWashStation.image) {
        carWashStation['image_url'] = SojebStorage.url(
          appConfig().storageUrl.carWashStation + carWashStation.image,
        );
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

  async update(id: string, updateCarWashStationDto: UpdateCarWashStationDto, file: Express.Multer.File) {
    try {
      let image = updateCarWashStationDto.image;

      // If a new file is uploaded, handle it
      if (file) {
        // Check if there's an old image to delete
        if (image) {
          await SojebStorage.delete(appConfig().storageUrl.carWashStation + image); // Delete the old file
        }

        const fileName = StringHelper.generateRandomFileName(file.originalname);
        await SojebStorage.put(appConfig().storageUrl.carWashStation + fileName, file.buffer);
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
          createdAt: true,
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
        await SojebStorage.delete(appConfig().storageUrl.carWashStation + carWashStation.image);
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
