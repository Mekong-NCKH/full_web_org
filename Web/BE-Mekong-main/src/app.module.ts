import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PositionController } from './presentation/controllers/position.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { PositionUseCases } from './application/use-cases/position.use-cases';
import { IPositionRepositoryToken } from './domain/repositories/position.repository.interface';

// Import ORM & TypeORM Repository
import { PositionOrmEntity } from './infrastructure/database/entities/position.orm-entity';
import { PositionDataOrmEntity } from './infrastructure/database/entities/position-data.orm-entity';
import { TypeOrmPositionRepository } from './infrastructure/repositories/typeorm-position.repository';
import { DatabaseBootstrapService } from './infrastructure/database/database-bootstrap.service';

@Module({
  imports: [
    // 1. Load file .env
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Cấu hình kết nối PostgreSQL
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
      port: process.env.DATABASE_URL
        ? undefined
        : parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
      password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
      database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
      ssl:
        process.env.DB_SSL === 'true' || Boolean(process.env.DATABASE_URL)
          ? { rejectUnauthorized: false }
          : false,
      entities: [PositionOrmEntity, PositionDataOrmEntity],
      synchronize: false, // Để false vì chúng ta đã tạo bảng bằng init.sql trong Docker
    }),

    // 3. Đăng ký Entities cho Repository
    TypeOrmModule.forFeature([PositionOrmEntity, PositionDataOrmEntity]),
  ],
  controllers: [HealthController, PositionController],
  providers: [
    DatabaseBootstrapService,
    PositionUseCases,
    {
      // Tráo đổi sự phụ thuộc: Từ nay khi app gọi Token này, nó sẽ dùng TypeOrmPositionRepository
      provide: IPositionRepositoryToken,
      useClass: TypeOrmPositionRepository,
    },
  ],
})
export class AppModule {}
