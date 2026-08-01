import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);

  const docTitle =
    configService.get<string>('SWAGGER_DOC_TITLE') ?? 'NestJS Auth API';
  const docDesc =
    configService.get<string>('SWAGGER_DOC_DESCRIPTION') ??
    'Complete authentication system';
  const docVersion = configService.get<string>('SWAGGER_DOC_VERSION') ?? '1.0';
  const siteTitle =
    configService.get<string>('SWAGGER_SITE_TITLE') ?? 'NestJS Auth API';

  const config = new DocumentBuilder()
    .setTitle(docTitle)
    .setDescription(docDesc)
    .setVersion(docVersion)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: siteTitle,
  });
}
