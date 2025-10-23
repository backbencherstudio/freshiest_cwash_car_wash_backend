import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SettingService {
  constructor(private readonly prisma: PrismaService) {}

  async updateTermsAndConditions(content: string) {
    try {
      // First, try to find existing setting
      let setting = await this.prisma.setting.findFirst({
        where: { key: 'terms_and_conditions' },
      });

      if (setting) {
        // Update existing setting
        setting = await this.prisma.setting.update({
          where: { id: setting.id },
          data: { 
            termsAndConditions: content,
            updated_at: new Date(),
          },
        });
      } else {
        // Create new setting
        setting = await this.prisma.setting.create({
          data: {
            key: 'terms_and_conditions',
            category: 'legal',
            label: 'Terms and Conditions',
            description: 'Terms and conditions content',
            termsAndConditions: content,
          },
        });
      }

      return {
        success: true,
        message: 'Terms and conditions updated successfully',
        data: setting,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updatePrivacyPolicy(content: string) {
    try {
      // First, try to find existing setting
      let setting = await this.prisma.setting.findFirst({
        where: { key: 'privacy_policy' },
      });

      if (setting) {
        // Update existing setting
        setting = await this.prisma.setting.update({
          where: { id: setting.id },
          data: { 
            privacyPolicy: content,
            updated_at: new Date(),
          },
        });
      } else {
        // Create new setting
        setting = await this.prisma.setting.create({
          data: {
            key: 'privacy_policy',
            category: 'legal',
            label: 'Privacy Policy',
            description: 'Privacy policy content',
            privacyPolicy: content,
          },
        });
      }

      return {
        success: true,
        message: 'Privacy policy updated successfully',
        data: setting,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateFaqSection(content: string) {
    try {
      // First, try to find existing setting
      let setting = await this.prisma.setting.findFirst({
        where: { key: 'faq_section' },
      });

      if (setting) {
        // Update existing setting
        setting = await this.prisma.setting.update({
          where: { id: setting.id },
          data: { 
            faqSection: content,
            updated_at: new Date(),
          },
        });
      } else {
        // Create new setting
        setting = await this.prisma.setting.create({
          data: {
            key: 'faq_section',
            category: 'content',
            label: 'FAQ Section',
            description: 'FAQ section content',
            faqSection: content,
          },
        });
      }

      return {
        success: true,
        message: 'FAQ section updated successfully',
        data: setting,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getAllSettings() {
    try {
      const settings = await this.prisma.setting.findMany({
        where: { deleted_at: null },
        orderBy: { created_at: 'desc' },
      });

      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getTermsAndConditions() {
    const setting = await this.prisma.setting.findFirst({
      where: { key: 'terms_and_conditions' },
    });
    return {
      success: true,
      data: setting,
    };
  }

  async getPrivacyPolicy() {
    const setting = await this.prisma.setting.findFirst({
      where: { key: 'privacy_policy' },
    });
    return {
      success: true,
      data: setting,
    };
  }

  async getFaqSection() {
    const setting = await this.prisma.setting.findFirst({
      where: { key: 'faq_section' },
    });
    return {
      success: true,
      data: setting,
    };
  }

  async editTermsAndConditions(body: any) {
    try {
      // Validate required fields
      if (!body.id && !body.key) {
        return {
          success: false,
          message: 'Either id or key is required',
        };
      }

      if (!body.termsAndConditions) {
        return {
          success: false,
          message: 'termsAndConditions field is required',
        };
      }

      // Use id if provided, otherwise use key
      const whereClause = body.id ? { id: body.id } : { key: body.key || 'terms_and_conditions' };

      const setting = await this.prisma.setting.update({
        where: whereClause,
        data: {
          termsAndConditions: body.termsAndConditions,
          updated_at: new Date(),
        },
      });
      return {
        success: true,
        message: 'Terms and conditions updated successfully',
        data: setting,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async editPrivacyPolicy(body: any) {
    try {
      // Validate required fields
      if (!body.id && !body.key) {
        return {
          success: false,
          message: 'Either id or key is required',
        };
      }

      if (!body.privacyPolicy) {
        return {
          success: false,
          message: 'privacyPolicy field is required',
        };
      }

      // Use id if provided, otherwise use key
      const whereClause = body.id ? { id: body.id } : { key: body.key || 'privacy_policy' };

      const setting = await this.prisma.setting.update({
        where: whereClause,
        data: {
          privacyPolicy: body.privacyPolicy,
          updated_at: new Date(),
        },
      });
      return {
        success: true,
        message: 'Privacy policy updated successfully',
        data: setting,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async editFaqSection(body: any) {
    try {
      // Validate required fields
      if (!body.id && !body.key) {
        return {
          success: false,
          message: 'Either id or key is required',
        };
      }

      if (!body.faqSection) {
        return {
          success: false,
          message: 'faqSection field is required',
        };
      }

      // Use id if provided, otherwise use key
      const whereClause = body.id ? { id: body.id } : { key: body.key || 'faq_section' };

      const setting = await this.prisma.setting.update({
        where: whereClause,
        data: {
          faqSection: body.faqSection,
          updated_at: new Date(),
        },
      });
      return {
        success: true,
        message: 'FAQ section updated successfully',
        data: setting,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
