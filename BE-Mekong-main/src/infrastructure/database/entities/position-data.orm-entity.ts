import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PositionOrmEntity } from './position.orm-entity';

@Entity('position_data')
export class PositionDataOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'station_id', type: 'varchar', length: 50 })
  stationId: string;

  @Column({ type: 'timestamp with time zone' })
  datetime: Date;

  @Column({ type: 'double precision', nullable: true })
  salinity: number;

  @Column({ name: 'water_level', type: 'double precision', nullable: true })
  waterLevel: number;

  @ManyToOne(() => PositionOrmEntity, position => position.data)
  @JoinColumn({ name: 'station_id' })
  position: PositionOrmEntity;
}
