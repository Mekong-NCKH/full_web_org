import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { PositionDataOrmEntity } from './position-data.orm-entity';

@Entity('positions')
export class PositionOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ name: 'distance_km', type: 'double precision', nullable: true })
  distanceKm: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  type: string;

  @OneToMany(() => PositionDataOrmEntity, data => data.position)
  data: PositionDataOrmEntity[];
}
