import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) { }

  // Create a new review
  async create(createReviewDto: CreateReviewDto, userId: string) {
    try {
      const review = await this.prisma.review.create({
        data: { ...createReviewDto, user_id: userId },
        select: {
          id: true,
          rating: true,
          comment: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          car_wash_station: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
      });

      // Update the car wash station rating and review count
      const [avgRating, reviewCount] = await Promise.all([
        this.prisma.review.aggregate({
          where: { car_wash_station_id: review.car_wash_station.id },
          _avg: { rating: true },
        }),
        this.prisma.review.count({
          where: { car_wash_station_id: review.car_wash_station.id },
        }),
      ]);

      // Update the car wash station with the new rating and review count
      await this.prisma.carWashStation.update({
        where: { id: review.car_wash_station.id },
        data: {
          rating: avgRating._avg.rating || 0,  // Default to 0 if no reviews yet
          reviewCount: reviewCount,
        },
      });

      return {
        success: true,
        message: 'Review created successfully',
        data: review,
      };
    } catch (error) {
      throw new Error(`Error creating review: ${error.message}`);
    }
  }

  // Get all reviews (with optional search query)
  async findAll(searchQuery: string | null) {
    try {
      const whereClause = {};
      if (searchQuery) {
        whereClause['OR'] = [
          { comment: { contains: searchQuery, mode: 'insensitive' } },
          { rating: { equals: Number(searchQuery) } },
        ];
      }

      const reviews = await this.prisma.review.findMany({
        where: whereClause,
        select: {
          id: true,
          rating: true,
          comment: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          car_wash_station: {
            select: {
              name: true,
              location: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return {
        success: true,
        message: reviews.length > 0 ? 'Reviews retrieved successfully' : 'No reviews found',
        data: reviews,
      };
    } catch (error) {
      throw new Error(`Error fetching reviews: ${error.message}`);
    }
  }

  // Find a single review by ID
  async findOne(id: string) {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
        select: {
          id: true,
          rating: true,
          comment: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          car_wash_station: {
            select: {
              name: true,
              location: true,
            },
          },
        },
      });

      return {
        success: true,
        message: review ? 'Review retrieved successfully' : 'Review not found',
        data: review,
      };
    } catch (error) {
      throw new Error(`Error fetching review: ${error.message}`);
    }
  }

  // Update a review
  async update(id: string, updateReviewDto: UpdateReviewDto,) {
    try {
      const review = await this.prisma.review.update({
        where: { id },
        data: updateReviewDto,
        select: {
          id: true,
          rating: true,
          comment: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          car_wash_station: {
            select: {
              name: true,
              location: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Review updated successfully',
        data: review,
      };
    } catch (error) {
      throw new Error(`Error updating review: ${error.message}`);
    }
  }

  // Delete a review
  async remove(id: string) {
    try {
      await this.prisma.review.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Review deleted successfully',
      };
    } catch (error) {
      throw new Error(`Error deleting review: ${error.message}`);
    }
  }
}
