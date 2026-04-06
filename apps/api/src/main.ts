import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  // Restrict JSON body size to prevent large-payload DoS
  app.use(express.json({ limit: '50kb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
    credentials: true,
  });

  // Exclude /health from the /api prefix so Render health checks work
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  console.log(`Code Atlas API running on port ${port}`);
}

bootstrap();
