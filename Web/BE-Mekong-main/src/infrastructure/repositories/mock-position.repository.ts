import { Injectable } from '@nestjs/common';
import { IPositionRepository } from '../../domain/repositories/position.repository.interface';
import { Position, PositionData } from '../../domain/entities/position.entity';

@Injectable()
export class MockPositionRepository implements IPositionRepository {
  async getPositionById(id: string): Promise<Position | null> {
    return (
      (await this.getPositions()).find((position) => position.id === id) ?? null
    );
  }

  async getSnapshot(_at: Date, _earliest: Date) {
    void _at;
    void _earliest;
    return (await this.getPositions()).map((station) => ({
      station,
      observation: null,
    }));
  }

  getObservations(
    _id: string,
    _from: Date,
    _to: Date,
    _limit: number,
  ): Promise<PositionData[]> {
    void _id;
    void _from;
    void _to;
    void _limit;
    return Promise.resolve([]);
  }

  getDataRange() {
    return Promise.resolve({ from: null, to: null });
  }

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
