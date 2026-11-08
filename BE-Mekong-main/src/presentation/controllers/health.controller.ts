import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  getRootHealth() {
    return {
      success: true,
      message: 'Server is healthy',
      runtime: 'vercel-serverless',
      database: 'neon-serverless',
    };
  }
}
