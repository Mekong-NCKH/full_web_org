import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';

import { AppModule } from '../src/app.module';

let appPromise: Promise<INestApplication> | null = null;

async function getApp(): Promise<INestApplication> {
  if (!appPromise) {
    appPromise = NestFactory.create(AppModule);
    const app = await appPromise;
    app.enableCors();
    await app.init();
  }

  return appPromise;
}

export default async function handler(req: any, res: any): Promise<void> {
  const app = await getApp();
  const instance = app.getHttpAdapter().getInstance();
  instance(req, res);
}
