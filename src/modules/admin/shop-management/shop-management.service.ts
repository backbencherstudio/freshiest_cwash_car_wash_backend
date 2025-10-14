import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateShopManagementDto, CreateProviderDto } from './dto/create-shop-management.dto';
import { UpdateShopManagementDto } from './dto/update-shop-management.dto';
import { ShopQueryDto } from './dto/shop-query.dto';
import { PriceCapsDto } from './dto/price-caps.dto';
import { CreatePromotionDto } from './dto/promotion.dto';

@Injectable()
export class ShopManagementService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ShopQueryDto) {
    try {
      const { search, status, page = 1, limit = 10 } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }

      if (status) {
        where.status = status;
      }

      // Get shops with related data
      const [shops, total] = await Promise.all([
        this.prisma.carWashStation.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                created_at: true
              }
            },
            bookings: {
              select: {
                id: true,
                total_amount: true,
                status: true,
                createdAt: true
              } 
            },
            reviews: {
              select: {
                id: true,
                rating: true
              }
            },
            services: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.carWashStation.count({ where })
      ]);

      // Transform data to match the interface
      const transformedShops = shops.map(shop => {
        const totalJobs = shop.bookings.length;
        const totalEarnings = shop.bookings
          .filter(booking => booking.status === 'completed')
          .reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0);
        
        const averageRating = shop.reviews.length > 0 
          ? shop.reviews.reduce((sum, review) => sum + review.rating, 0) / shop.reviews.length
          : 0;

        return {
          id: shop.id,
          provider: {
            name: shop.name,
            location: shop.location,
            image: shop.image
          },
          contact: {
            amount: totalEarnings,
            since: shop.user?.created_at ? new Date(shop.user.created_at).toISOString().split('T')[0] : null
          },
          performance: {
            rating: Number(averageRating.toFixed(1)),
            jobs: totalJobs,
            earnings: totalEarnings
          },
          status: shop.status,
          user: shop.user,
          services: shop.services,
          createdAt: shop.createdAt,
          updatedAt: shop.updatedAt
        };
      });

      return {
        success: true,
        data: {
          shops: transformedShops,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string) {
    try {
      const shop = await this.prisma.carWashStation.findUnique({
        where: { id },
        include: {
          user: true,
          bookings: true,
          reviews: true,
          services: true
        }
      });

      if (!shop) {
        return {
          success: false,
          message: 'Shop not found',
        };
      }

      return {
        success: true,
        data: shop,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async create(createShopDto: CreateShopManagementDto) {
    try {
      const shop = await this.prisma.carWashStation.create({
        data: {
          name: createShopDto.name,
          description: createShopDto.description,
          location: createShopDto.location,
          latitude: createShopDto.latitude,
          longitude: createShopDto.longitude,
          pricePerWash: createShopDto.pricePerWash || 0,
          image: createShopDto.image,
          status: createShopDto.status || 'active',
          user_id: createShopDto.userId,
          updatedAt: new Date()
        },
        include: {
          user: true
        }
      });

      return {
        success: true,
        data: shop,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateShopDto: UpdateShopManagementDto) {
    try {
      const shop = await this.prisma.carWashStation.update({
        where: { id },
        data: {
          ...updateShopDto,
          updatedAt: new Date()
        },
        include: {
          user: true
        }
      });

      return {
        success: true,
        data: shop,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.carWashStation.delete({
        where: { id }
      });

      return {
        success: true,
        message: 'Shop deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async setPriceCaps(priceCapsDto: PriceCapsDto) {
    try {
      // This would typically be stored in a separate table for price caps
      // For now, we'll update the shop's pricePerWash as an example
      const shop = await this.prisma.carWashStation.update({
        where: { id: priceCapsDto.shopId },
        data: {
          pricePerWash: priceCapsDto.basicWashCap,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        data: {
          shop,
          priceCaps: priceCapsDto
        },
        message: 'Price caps set successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async createPromotion(createPromotionDto: CreatePromotionDto) {
    try {
      // This would typically be stored in a promotions table
      // For now, we'll return a mock response
      const promotion = {
        id: `promo_${Date.now()}`,
        ...createPromotionDto,
        created_at: new Date(),
        updated_at: new Date()
      };

      return {
        success: true,
        data: promotion,
        message: 'Promotion created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getShopStats(id: string) {
    try {
      const shop = await this.prisma.carWashStation.findUnique({
        where: { id },
        include: {
          bookings: {
            where: { status: 'completed' }
          },
          reviews: true
        }
      });

      if (!shop) {
        return {
          success: false,
          message: 'Shop not found',
        };
      }

      const stats = {
        totalJobs: shop.bookings.length,
        totalEarnings: shop.bookings.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0),
        averageRating: shop.reviews.length > 0 
          ? shop.reviews.reduce((sum, review) => sum + review.rating, 0) / shop.reviews.length
          : 0,
        totalReviews: shop.reviews.length
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async createProvider(createProviderDto: CreateProviderDto) {
    try {
      // Check if user with this email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createProviderDto.email }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'A provider with this email already exists',
        };
      }

      // Create new provider user
      const provider = await this.prisma.user.create({
        data: {
          name: createProviderDto.businessName,
          email: createProviderDto.email,
          phone_number: createProviderDto.phone,
          city: createProviderDto.city,
          status: createProviderDto.status === 'active' ? 1 : 0,
          type: 'vendor', // Mark as vendor/provider
          created_at: new Date(),
          updated_at: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          city: true,
          status: true,
          type: true,
          created_at: true
        }
      });

      return {
        success: true,
        message: 'Provider created successfully',
        data: provider,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating provider: ${error.message}`,
      };
    }
  }
}
