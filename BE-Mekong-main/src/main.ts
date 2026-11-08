import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT || 3001);

  // Bật CORS
  app.enableCors();

  await app.listen(port);
  console.log(`NestJS Server đang chạy tại http://localhost:${port}`);
}
bootstrap();
