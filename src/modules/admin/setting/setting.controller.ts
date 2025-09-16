import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SettingService } from './setting.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('setting')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Post("terms-and-conditions")
  async termsAndConditions(@Body() body: string) {
    return this.settingService.termsAndConditions(body);
  }
  
  @Post("privacy-policy")
  async privacyPolicy(@Body() body: string) {
    return this.settingService.privacyPolicy(body);
  }
  
  @Post("faq-section")
  async faqSection(@Body() body: string) {
    return this.settingService.faqSection(body);
  }

}
