import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Service')
@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) { }

  @ApiOperation({ summary: 'Create a new service' })
  @Post()
  @UseInterceptors(FileInterceptor('image')) // Interceptor for handling file upload (image)
  async create(@Body() createServiceDto: CreateServiceDto, @UploadedFile() file: Express.Multer.File) {
    try {
      const service = await this.serviceService.create(createServiceDto, file);
      return service;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Find all services (with optional search query)' })
  @Get()
  async findAll(@Query('q') searchQuery: string | null) {
    try {
      const services = await this.serviceService.findAll(searchQuery);
      return services;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Find a single service by ID' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const service = await this.serviceService.findOne(id);
      return service;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Update an existing service' })
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image')) // Interceptor for handling file upload (image)
  async update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto, @UploadedFile() file: Express.Multer.File) {
    try {
      const service = await this.serviceService.update(id, updateServiceDto, file);
      return service;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Delete a service by ID' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const service = await this.serviceService.remove(id);
      return service;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
