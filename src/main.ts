import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './swagger-setup';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const isSwaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED') === 'true';
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const showSwagger = isSwaggerEnabled || !isProduction;

  if (showSwagger) {
    setupSwagger(app);
  }

  const port = configService.get<number>('PORT') ?? 5000;

  await app.listen(port);

  logger.log(`Application running on http://localhost:${port}/api`);
  if (showSwagger) {
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}
void bootstrap();
