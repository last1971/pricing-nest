import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SeedService } from './seed/seed.service';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(cookieParser());
    await app.get(SeedService).execute();
    // await app.startAllMicroservices();
    await app.listen(app.get(ConfigService).get<number>('APP_PORT'));
}
bootstrap();
