import { Test } from '@nestjs/testing';
import { INestApplication, LoggerService, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

// The app as main.ts builds it (cookie parsing and the global validation
// pipe), for specs that need the real HTTP stack. A spec that checks
// what the API logs passes its own logger.
export async function createTestApp(logger?: LoggerService): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication(logger ? { logger } : undefined);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}
