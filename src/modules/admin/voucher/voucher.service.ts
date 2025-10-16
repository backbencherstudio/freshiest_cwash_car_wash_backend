import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VoucherService {
  constructor(private prisma: PrismaService) { }

  async create(createVoucherDto: CreateVoucherDto) {
    try {
      // Ensure expiryDate is properly formatted for Prisma
      if (createVoucherDto.expiryDate) {
        try {
          createVoucherDto.expiryDate = new Date(createVoucherDto.expiryDate).toISOString();
        } catch (error) {
          return {
            success: false,
            message: `Invalid expiry date format: ${createVoucherDto.expiryDate}. Please use ISO-8601 format (e.g., '2024-12-31' or '2024-12-31T00:00:00.000Z')`,
          };
        }
      }

      // Check if voucher code already exists
      const existingVoucher = await this.prisma.voucher.findFirst({
        where: { code: createVoucherDto.code },
      });

      if (existingVoucher) {
        return {
          success: false,
          message: `Voucher with code '${createVoucherDto.code}' already exists`,
        };
      }

      // Create voucher
      const voucher = await this.prisma.voucher.create({
        data: {
          ...createVoucherDto,
          updatedAt: new Date()
        },
        select: {
          id: true,
          code: true,
          discount_percentage: true,
          is_active: true,
          expiryDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        message: 'Voucher created successfully',
        data: voucher,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating voucher: ${error.message}`,
      };
    }
  }

  async findAll(searchQuery: string | null) {
    try {
      const whereClause = {};
      if (searchQuery) {
        whereClause['OR'] = [
          { code: { contains: searchQuery, mode: 'insensitive' } },
        ];
      }

      const vouchers = await this.prisma.voucher.findMany({
        where: whereClause,
        select: {
          id: true,
          code: true,
          discount_percentage: true,
          is_active: true,
          expiryDate: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        message: vouchers.length > 0 ? 'Vouchers retrieved successfully' : 'No vouchers found',
        data: vouchers,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching vouchers: ${error.message}`,
      };
    }
  }

  async findOne(id: string) {
    try {
      const voucher = await this.prisma.voucher.findUnique({
        where: { id },
        select: {
          id: true,
          code: true,
          discount_percentage: true,
          is_active: true,
          expiryDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!voucher) {
        return {
          success: false,
          message: 'Voucher not found',
        };
      }

      return {
        success: true,
        message: 'Voucher retrieved successfully',
        data: voucher,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching voucher: ${error.message}`,
      };
    }
  }

  async findByCode(code: string) {
    try {
      const voucher = await this.prisma.voucher.findFirst({
        where: { code },
        select: {
          id: true,
          code: true,
          discount_percentage: true,
          is_active: true,
          expiryDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!voucher) {
        return {
          success: false,
          message: 'Voucher not found',
        };
      }

      // Check if voucher is expired
      if (new Date() > new Date(voucher.expiryDate)) {
        return {
          success: false,
          message: 'Voucher has expired',
        };
      }

      // Check if voucher is active
      if (!voucher.is_active) {
        return {
          success: false,
          message: 'Voucher is not active',
        };
      }

      return {
        success: true,
        message: 'Voucher retrieved successfully',
        data: voucher,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching voucher: ${error.message}`,
      };
    }
  }

  async update(id: string, updateVoucherDto: UpdateVoucherDto) {
    try {
      // Ensure expiryDate is properly formatted for Prisma if provided
      if (updateVoucherDto.expiryDate) {
        try {
          updateVoucherDto.expiryDate = new Date(updateVoucherDto.expiryDate).toISOString();
        } catch (error) {
          return {
            success: false,
            message: `Invalid expiry date format: ${updateVoucherDto.expiryDate}. Please use ISO-8601 format (e.g., '2024-12-31' or '2024-12-31T00:00:00.000Z')`,
          };
        }
      }

      // Check if voucher exists
      const existingVoucher = await this.prisma.voucher.findUnique({
        where: { id },
      });

      if (!existingVoucher) {
        return {
          success: false,
          message: 'Voucher not found',
        };
      }

      // If updating code, check if new code already exists
      if (updateVoucherDto.code && updateVoucherDto.code !== existingVoucher.code) {
        const codeExists = await this.prisma.voucher.findFirst({
          where: {
            code: updateVoucherDto.code,
            id: { not: id } // Exclude current voucher
          },
        });

        if (codeExists) {
          return {
            success: false,
            message: `Voucher with code '${updateVoucherDto.code}' already exists`,
          };
        }
      }

      // Update voucher
      const voucher = await this.prisma.voucher.update({
        where: { id },
        data: {
          ...updateVoucherDto,
          updatedAt: new Date()
        },
        select: {
          id: true,
          code: true,
          discount_percentage: true,
          is_active: true,
          expiryDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        message: 'Voucher updated successfully',
        data: voucher,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating voucher: ${error.message}`,
      };
    }
  }

  async remove(id: string) {
    try {
      // Check if voucher exists
      const existingVoucher = await this.prisma.voucher.findUnique({
        where: { id },
      });

      if (!existingVoucher) {
        return {
          success: false,
          message: 'Voucher not found',
        };
      }

      // Delete voucher
      await this.prisma.voucher.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Voucher deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error deleting voucher: ${error.message}`,
      };
    }
  }

  async toggleActive(id: string) {
    try {
      // Check if voucher exists
      const existingVoucher = await this.prisma.voucher.findUnique({
        where: { id },
      });

      if (!existingVoucher) {
        return {
          success: false,
          message: 'Voucher not found',
        };
      }

      // Toggle active status
      const voucher = await this.prisma.voucher.update({
        where: { id },
        data: { 
          is_active: !existingVoucher.is_active,
          updatedAt: new Date()
        },
        select: {
          id: true,
          code: true,
          discount_percentage: true,
          is_active: true,
          expiryDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        message: `Voucher ${voucher.is_active ? 'activated' : 'deactivated'} successfully`,
        data: voucher,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error toggling voucher status: ${error.message}`,
      };
    }
  }

  async getActiveVouchers() {
    try {
      const vouchers = await this.prisma.voucher.findMany({
        where: {
          is_active: true,
          expiryDate: { gt: new Date() } // Not expired
        },
        select: {
          id: true,
          code: true,
          discount_percentage: true,
          is_active: true,
          expiryDate: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        message: vouchers.length > 0 ? 'Active vouchers retrieved successfully' : 'No active vouchers found',
        data: vouchers,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching active vouchers: ${error.message}`,
      };
    }
  }
}
