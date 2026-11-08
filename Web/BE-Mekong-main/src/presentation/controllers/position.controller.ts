import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { PositionUseCases } from '../../application/use-cases/position.use-cases';
import { parseLegacyDateTime } from '../date-validation';
import {
  assertInsidePublicWindow,
  getPublicDataWindow,
  isPublicStationId,
  publicStationIds,
  toPublicStation,
} from '../public-data-policy';

@Controller('api/data')
export class PositionController {
  constructor(private readonly positionUseCases: PositionUseCases) {}

  @Get('positions')
  async getPositions() {
    const window = getPublicDataWindow();
    const range = await this.positionUseCases.getDataRange(
      publicStationIds(),
      window?.from,
      window?.to,
    );
    if (!range.from || !range.to) return { success: true, data: [] };

    const snapshots = await this.positionUseCases.getSnapshot(
      new Date(range.to),
      new Date(range.from),
    );
    const stationIdsWithData = new Set(
      snapshots
        .filter(({ observation }) => observation !== null)
        .map(({ station }) => station.id),
    );
    const data = (await this.positionUseCases.getAllPositions()).flatMap(
      (position) => {
        const publicStation = toPublicStation(position);
        if (!publicStation || !stationIdsWithData.has(position.id)) return [];
        return [
          {
            id: publicStation.id,
            name: publicStation.name,
            latitude: publicStation.location.latitude,
            longitude: publicStation.location.longitude,
          },
        ];
      },
    );
    return { success: true, data };
  }

  @Get('date-range/:date/:startTime/:endTime/:positionId')
  async getPositionData(
    @Param('date') date: string,
    @Param('startTime') startTime: string,
    @Param('endTime') endTime: string,
    @Param('positionId') positionId: string,
  ) {
    const window = getPublicDataWindow();
    if (!isPublicStationId(positionId))
      throw new NotFoundException('Station not found');
    const from = parseLegacyDateTime(date, startTime);
    const to = parseLegacyDateTime(date, endTime);
    assertInsidePublicWindow(from, to, window);
    if (from > to)
      throw new BadRequestException('startTime must be before endTime');

    const data = await this.positionUseCases.getPositionData(
      date,
      startTime,
      endTime,
      positionId,
    );
    return { success: true, data };
  }
}
