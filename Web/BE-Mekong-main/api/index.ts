import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AppModule } from '../src/app.module';
import { getCorsOptions } from '../src/config/cors';

let appPromise: Promise<INestApplication> | null = null;

async function getApp(): Promise<INestApplication> {
  if (!appPromise) {
    appPromise = NestFactory.create(AppModule);
    const app = await appPromise;
    app.enableCors(getCorsOptions());
    await app.init();
  }

  return appPromise;
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  const app = await getApp();
  const instance = app.getHttpAdapter().getInstance() as (
    request: Request,
    response: Response,
  ) => void;
  instance(req, res);
}
