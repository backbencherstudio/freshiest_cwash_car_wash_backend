import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SettingService } from './setting.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('setting')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Post("terms-and-conditions")
  async termsAndConditions(@Body() body: any) {
    const content = typeof body === 'string' ? body : body.content || body;
    return this.settingService.updateTermsAndConditions(content);
  }
  
  @Post("privacy-policy")
  async privacyPolicy(@Body() body: any) {
    const content = typeof body === 'string' ? body : body.content || body;
    return this.settingService.updatePrivacyPolicy(content);
  }
  
  @Post("faq-section")
  async faqSection(@Body() body: any) {
    const content = typeof body === 'string' ? body : body.content || body;
    return this.settingService.updateFaqSection(content);
  }

  //get terms and conditions, privacy policy, faq section
  @Get("terms-and-conditions")
  async getTermsAndConditions() {
    return this.settingService.getTermsAndConditions();
  }
  
  @Get("privacy-policy")
  async getPrivacyPolicy() {
    return this.settingService.getPrivacyPolicy();
  }
  
  @Get("faq-section")
  async getFaqSection() {
    return this.settingService.getFaqSection();
  }

  // edit terms and conditions, privacy policy, faq section
  @Patch("terms-and-conditions")
  async editTermsAndConditions(@Body() body: any) {
    return this.settingService.editTermsAndConditions(body);
  }
  
  @Patch("privacy-policy")
  async editPrivacyPolicy(@Body() body: any) {
    return this.settingService.editPrivacyPolicy(body);
  }
  
  @Patch("faq-section")
  async editFaqSection(@Body() body: any) {
    return this.settingService.editFaqSection(body);
  }

}
