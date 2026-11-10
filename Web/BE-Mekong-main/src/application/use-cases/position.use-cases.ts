import { Injectable, Inject, NotFoundException } from '@nestjs/common';
// Thêm từ khóa 'type' trước IPositionRepository
import {
  IPositionRepositoryToken,
  type IPositionRepository,
} from '../../domain/repositories/position.repository.interface';
import { Position, PositionData } from '../../domain/entities/position.entity';

@Injectable()
export class PositionUseCases {
  constructor(
    @Inject(IPositionRepositoryToken)
    private readonly positionRepository: IPositionRepository,
  ) {}

  async getAllPositions(): Promise<Position[]> {
    return this.positionRepository.getPositions();
  }

  async getObservations(
    id: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<PositionData[]> {
    if (!(await this.positionRepository.getPositionById(id)))
      throw new NotFoundException('Station not found');
    return this.positionRepository.getObservations(id, from, to, limit);
  }

  getSnapshot(at: Date, earliest: Date) {
    return this.positionRepository.getSnapshot(at, earliest);
  }

  getDataRange(stationIds: string[], from?: Date | null, to?: Date | null) {
    return this.positionRepository.getDataRange(stationIds, from, to);
  }

  async getPositionData(
    date: string,
    startTime: string,
    endTime: string,
    positionId: string,
  ): Promise<PositionData[]> {
    return this.positionRepository.getPositionDataByDateRange(
      date,
      startTime,
      endTime,
      positionId,
    );
  }
}
