import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SeedService } from './seed/seed.service';
import { SandboxService } from './sandbox/sandbox.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe());
    await app.get(SeedService).execute();
    await app.get(SandboxService).test();
    await app.listen(3000);
}
bootstrap();
