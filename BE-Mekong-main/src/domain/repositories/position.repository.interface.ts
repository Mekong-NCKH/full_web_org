import { Position, PositionData } from '../entities/position.entity';

export const IPositionRepositoryToken = 'IPositionRepository';

export interface IPositionRepository {
  getPositions(): Promise<Position[]>;
  getPositionDataByDateRange(
    date: string,
    startTime: string,
    endTime: string,
    positionId: string,
  ): Promise<PositionData[]>;
}
