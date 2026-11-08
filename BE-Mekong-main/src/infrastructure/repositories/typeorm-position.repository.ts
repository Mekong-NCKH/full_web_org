import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { IPositionRepository } from '../../domain/repositories/position.repository.interface';
import { Position, PositionData } from '../../domain/entities/position.entity';
import { PositionOrmEntity } from '../database/entities/position.orm-entity';
import { PositionDataOrmEntity } from '../database/entities/position-data.orm-entity';

@Injectable()
export class TypeOrmPositionRepository implements IPositionRepository {
  constructor(
    @InjectRepository(PositionOrmEntity)
    private readonly positionRepo: Repository<PositionOrmEntity>,
    @InjectRepository(PositionDataOrmEntity)
    private readonly dataRepo: Repository<PositionDataOrmEntity>,
  ) {}

  async getPositions(): Promise<Position[]> {
    const ormPositions = await this.positionRepo.find();
    
    // Map ORM Entity sang Domain Entity
    return ormPositions.map(p => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      distanceKm: p.distanceKm,
      type: p.type,
    }));
  }

  async getPositionDataByDateRange(
    date: string,
    startTime: string,
    endTime: string,
    positionId: string,
  ): Promise<PositionData[]> {
    const start = this.parseApiDateTime(date, startTime);
    const end = this.parseApiDateTime(date, endTime);

    if (start > end) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const ormData = await this.dataRepo.find({
      where: {
        stationId: positionId,
        datetime: Between(start, end),
      },
      relations: ['position'], // Lấy luôn bảng cha (positions) để lấy tên trạm
      order: { datetime: 'ASC' },
    });

    // Map ORM Entity sang cấu trúc mà API/Frontend cần
    return ormData.map(d => ({
      id: d.id,
      station_id: d.stationId,
      station_name: d.position?.name,
      datetime: d.datetime.toISOString(),
      salinity: d.salinity,
      water_level: d.waterLevel,
    }));
  }

  private parseApiDateTime(date: string, time: string): Date {
    const dateMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date);
    const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time);

    if (!dateMatch || !timeMatch) {
      throw new BadRequestException(
        'Invalid date range. Expected date YYYY-MM-DD and time HH:mm:ss',
      );
    }

    const [, year, monthRaw, dayRaw] = dateMatch;
    const [, hourRaw, minuteRaw, secondRaw = '00'] = timeMatch;
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    const second = Number(secondRaw);

    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      hour > 23 ||
      minute > 59 ||
      second > 59
    ) {
      throw new BadRequestException('Invalid date range value');
    }

    const value = new Date(
      `${year}-${monthRaw.padStart(2, '0')}-${dayRaw.padStart(2, '0')}T${hourRaw.padStart(2, '0')}:${minuteRaw}:${secondRaw}+07:00`,
    );

    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException('Invalid date range value');
    }

    return value;
  }
}
