import { Controller, Get, Param } from '@nestjs/common';
import { PositionUseCases } from '../../application/use-cases/position.use-cases';

@Controller('api/data')
export class PositionController {
  constructor(private readonly positionUseCases: PositionUseCases) {}

  @Get('positions')
  async getPositions() {
    const data = await this.positionUseCases.getAllPositions();
    return { success: true, data };
  }

  @Get('date-range/:date/:startTime/:endTime/:positionId')
  async getPositionData(
    @Param('date') date: string,
    @Param('startTime') startTime: string,
    @Param('endTime') endTime: string,
    @Param('positionId') positionId: string,
  ) {
    const data = await this.positionUseCases.getPositionData(
      date,
      startTime,
      endTime,
      positionId,
    );
    return { success: true, data };
  }
}
