import { Injectable } from '@nestjs/common';
import { IPositionRepository } from '../../domain/repositories/position.repository.interface';
import { Position, PositionData } from '../../domain/entities/position.entity';

@Injectable()
export class MockPositionRepository implements IPositionRepository {
  getPositions(): Promise<Position[]> {
    return Promise.resolve([
      {
        id: 'station-1',
        name: 'Trạm A',
        latitude: 10.35,
        longitude: 106.26,
        distanceKm: 2.5,
        type: 'CỐNG',
      },
      {
        id: 'station-2',
        name: 'Trạm B',
        latitude: 10.4,
        longitude: 106.3,
        distanceKm: 5.0,
        type: 'TRẠM ĐO',
      },
    ]);
  }

  // Tương tự cho hàm này
  getPositionDataByDateRange(
    date: string,
    startTime: string,
    endTime: string,
    positionId: string,
  ): Promise<PositionData[]> {
    return Promise.resolve([
      {
        id: 'obs-1',
        station_id: positionId,
        station_name: positionId === 'station-1' ? 'Trạm A' : 'Trạm B',
        datetime: `${date}T10:00:00Z`,
        salinity: 1.23,
        water_level: 0.45,
      },
    ]);
  }
}
