import { Injectable, Inject } from '@nestjs/common';
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
