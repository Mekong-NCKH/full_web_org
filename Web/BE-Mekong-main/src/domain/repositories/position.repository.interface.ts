import {
  Position,
  PositionData,
  StationSnapshot,
  DataRange,
} from '../entities/position.entity';

export const IPositionRepositoryToken = 'IPositionRepository';

export interface IPositionRepository {
  getPositions(): Promise<Position[]>;
  getPositionById(id: string): Promise<Position | null>;
  getObservations(
    positionId: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<PositionData[]>;
  getSnapshot(at: Date, earliest: Date): Promise<StationSnapshot[]>;
  getDataRange(
    stationIds: string[],
    from?: Date | null,
    to?: Date | null,
  ): Promise<DataRange>;
  getPositionDataByDateRange(
    date: string,
    startTime: string,
    endTime: string,
    positionId: string,
  ): Promise<PositionData[]>;
}
