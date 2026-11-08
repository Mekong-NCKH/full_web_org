import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { IPositionRepository } from '../../domain/repositories/position.repository.interface';
import {
  DataRange,
  Position,
  PositionData,
  StationSnapshot,
} from '../../domain/entities/position.entity';
import { parseLegacyDateTime } from '../../presentation/date-validation';
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

  private mapPosition(p: PositionOrmEntity): Position {
    return {
      id: p.id,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      distanceKm: p.distanceKm ?? null,
      type: p.type ?? null,
    };
  }

  private mapObservation(d: PositionDataOrmEntity): PositionData {
    return {
      id: d.id,
      station_id: d.stationId,
      station_name: d.position?.name,
      datetime: d.datetime.toISOString(),
      salinity: d.salinity ?? null,
      water_level: d.waterLevel ?? null,
    };
  }

  async getPositions(): Promise<Position[]> {
    return (await this.positionRepo.find({ order: { id: 'ASC' } })).map((p) =>
      this.mapPosition(p),
    );
  }

  async getPositionById(id: string): Promise<Position | null> {
    const position = await this.positionRepo.findOneBy({ id });
    return position ? this.mapPosition(position) : null;
  }

  async getObservations(
    positionId: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<PositionData[]> {
    const rows = await this.dataRepo.find({
      where: { stationId: positionId, datetime: Between(from, to) },
      relations: ['position'],
      order: { datetime: 'ASC', id: 'ASC' },
      take: limit,
    });
    return rows.map((row) => this.mapObservation(row));
  }

  async getSnapshot(at: Date, earliest: Date): Promise<StationSnapshot[]> {
    const stations = await this.getPositions();
    const observations = await this.dataRepo
      .createQueryBuilder('observation')
      .distinctOn(['observation.stationId'])
      .where(
        'observation.datetime >= :earliest AND observation.datetime <= :at',
        { earliest, at },
      )
      .orderBy('observation.stationId', 'ASC')
      .addOrderBy('observation.datetime', 'DESC')
      .addOrderBy('observation.id', 'ASC')
      .getMany();
    const byStation = new Map(
      observations.map((row) => [row.stationId, this.mapObservation(row)]),
    );
    return stations.map((station) => ({
      station,
      observation: byStation.get(station.id) ?? null,
    }));
  }

  async getDataRange(
    stationIds: string[],
    from?: Date | null,
    to?: Date | null,
  ): Promise<DataRange> {
    if (stationIds.length === 0) return { from: null, to: null };
    const query = this.dataRepo
      .createQueryBuilder('observation')
      .select('MIN(observation.datetime)', 'from')
      .addSelect('MAX(observation.datetime)', 'to')
      .where('observation.stationId IN (:...stationIds)', { stationIds });
    if (from) query.andWhere('observation.datetime >= :from', { from });
    if (to) query.andWhere('observation.datetime <= :to', { to });
    const row = await query.getRawOne<{
      from: Date | string | null;
      to: Date | string | null;
    }>();
    return {
      from: row?.from ? new Date(row.from).toISOString() : null,
      to: row?.to ? new Date(row.to).toISOString() : null,
    };
  }

  async getPositionDataByDateRange(
    date: string,
    startTime: string,
    endTime: string,
    positionId: string,
  ): Promise<PositionData[]> {
    const from = parseLegacyDateTime(date, startTime);
    const to = parseLegacyDateTime(date, endTime);
    if (from > to)
      throw new BadRequestException('startTime must be before endTime');
    const rows = await this.dataRepo.find({
      where: { stationId: positionId, datetime: Between(from, to) },
      relations: ['position'],
      order: { datetime: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => this.mapObservation(row));
  }
}
