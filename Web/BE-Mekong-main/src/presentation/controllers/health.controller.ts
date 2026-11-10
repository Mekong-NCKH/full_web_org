import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  getRootHealth() {
    return {
      success: true,
      status: 'ok',
      service: 'mekong-salinity-api',
    };
  }
}
