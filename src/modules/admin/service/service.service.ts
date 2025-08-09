import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { StringHelper } from 'src/common/helper/string.helper';

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) { }

  // Create a new service with optional image file
  async create(createServiceDto: CreateServiceDto, file?: Express.Multer.File) {
    try {
      if (file) {
        const fileName = StringHelper.generateRandomFileName(file.originalname);
        await SojebStorage.put(appConfig().storageUrl.service + fileName, file.buffer);
        createServiceDto.image = fileName;
      }

      const service = await this.prisma.service.create({
        data: {
          ...createServiceDto,
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          status: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Add image URL if image exists
      if (service.image) {
        service['image_url'] = SojebStorage.url(appConfig().storageUrl.service + service.image);
      }

      return {
        success: true,
        message: 'Service created successfully',
        data: service,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating service: ${error.message}`,
      };
    }
  }

  // Find all services (with optional search query)
  async findAll(searchQuery: string | null) {
    try {
      const whereClause = {};
      if (searchQuery) {
        whereClause['OR'] = [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ];
      }
      const services = await this.prisma.service.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          status: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Add image URLs
      if (services && services.length > 0) {
        for (const record of services) {
          if (record.image) {
            record['image_url'] = SojebStorage.url(appConfig().storageUrl.service + record.image);
          }
        }
      }

      return {
        success: true,
        message: services.length
          ? 'Services retrieved successfully'
          : 'No services found',
        data: services,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching services: ${error.message}`,
      };
    }
  }

  // Find a single service by ID
  async findOne(id: string) {
    try {
      const service = await this.prisma.service.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          status: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (service && service.image) {
        service['image_url'] = SojebStorage.url(appConfig().storageUrl.service + service.image);
      }

      return {
        success: true,
        message: service ? 'Service retrieved successfully' : 'Service not found',
        data: service,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching service: ${error.message}`,
      };
    }
  }

  // Update an existing service with optional image file
  async update(id: string, updateServiceDto: UpdateServiceDto, file?: Express.Multer.File) {
    try {
      let image = updateServiceDto.image;

      // If a new file is uploaded, handle it
      if (file) {
        // Delete old image if exists
        if (image) {
          await SojebStorage.delete(appConfig().storageUrl.service + image);
        }
        const fileName = StringHelper.generateRandomFileName(file.originalname);
        await SojebStorage.put(appConfig().storageUrl.service + fileName, file.buffer);
        image = fileName;
      }

      const service = await this.prisma.service.update({
        where: { id },
        data: {
          ...updateServiceDto,
          image,
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          status: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (service.image) {
        service['image_url'] = SojebStorage.url(appConfig().storageUrl.service + service.image);
      }

      return {
        success: true,
        message: 'Service updated successfully',
        data: service,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating service: ${error.message}`,
      };
    }
  }

  // Delete a service by ID and its image
  async remove(id: string) {
    try {
      const service = await this.prisma.service.findUnique({
        where: { id },
        select: { id: true, image: true },
      });

      if (service && service.image) {
        await SojebStorage.delete(appConfig().storageUrl.service + service.image);
      }

      await this.prisma.service.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Service deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error deleting service: ${error.message}`,
      };
    }
  }
}
