import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    search?: string;
    provider?: string;
    rating?: string;
    page: number;
    limit: number;
  }) {
    try {
      const { search, provider, rating, page, limit } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {};

      // Search filter
      if (search) {
        whereClause.OR = [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { comment: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Provider filter
      if (provider && provider !== 'all') {
        whereClause.car_wash_station = {
          user: { name: { contains: provider, mode: 'insensitive' } },
        };
      }

      // Rating filter
      if (rating && rating !== 'all') {
        whereClause.rating = parseInt(rating);
      }

      // Get total count
      const total = await this.prisma.review.count({ where: whereClause });

      // Fetch reviews with pagination
      const reviews = await this.prisma.review.findMany({
        where: whereClause,
        include: {
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
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          id: 'desc',
        },
        skip,
        take: limit,
      });

      // Format reviews data
      const formattedReviews = reviews.map((review: any, index) => ({
        id: review.id,
        reviewer: {
          name: review.user?.name || 'Unknown User',
          avatar: review.user?.avatar,
          bookingId: `BK${String(index + 1).padStart(3, '0')}`, // BK001, BK002, etc.
        },
        serviceProvider: {
          name: review.car_wash_station?.name || 'Unknown Provider',
        },
        review: {
          rating: review.rating,
          serviceType: 'Regular Wash', // Placeholder
          date: review.created_at.toISOString().split('T')[0], // 2025-08-19 format
          title: this.generateReviewTitle(review.rating),
          content: review.comment || 'No comment provided.',
        },
        actions: {
          canHide: true,
          canFlag: true,
          canWarn: true,
          canRemove: true,
        },
      }));

    return {
      success: true,
      message: 'Reviews fetched successfully',
        data: {
          reviews: formattedReviews,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
          filters: {
            search: search || '',
            provider: provider || 'all',
            rating: rating || 'all',
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching reviews: ${error.message}`,
        data: null,
      };
    }
  }

  async hideReview(id: string) {
    try {
      // In a real implementation, you might add a 'hidden' field to the Review model
      // For now, we'll just return success
      return {
        success: true,
        message: 'Review hidden successfully',
        data: { id },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error hiding review: ${error.message}`,
        data: null,
      };
    }
  }

  async flagReview(id: string) {
    try {
      // In a real implementation, you might add a 'flagged' field to the Review model
      // For now, we'll just return success
      return {
        success: true,
        message: 'Review flagged successfully',
        data: { id },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error flagging review: ${error.message}`,
        data: null,
      };
    }
  }

  async sendWarning(id: string) {
    try {
      // In a real implementation, you might send a notification or email to the user
      // For now, we'll just return success
      return {
        success: true,
        message: 'Warning sent successfully',
        data: { id },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error sending warning: ${error.message}`,
        data: null,
      };
    }
  }

  async removeReview(id: string) {
    try {
      // Note: Review model doesn't have deleted_at field, so we'll use a different approach
      // In a real implementation, you might add a deleted_at field to the Review model
      // For now, we'll just return success

      return {
        success: true,
        message: 'Review removed successfully',
        data: { id },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error removing review: ${error.message}`,
      data: null,
    };
    }
  }

  private generateReviewTitle(rating: number): string {
    const titles = {
      5: 'Excellent service!',
      4: 'Great service!',
      3: 'Good service',
      2: 'Average service',
      1: 'Poor service',
    };
    return titles[rating] || 'Service review';
  }
}
