import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const corsOrigins = process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:5173'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
}

bootstrap();
