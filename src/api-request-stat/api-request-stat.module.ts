import { Module } from '@nestjs/common';
import { ApiRequestStatService } from './api-request-stat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiRequestStat, ApiRequestStatSchema } from './api.request.stat.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: ApiRequestStat.name, schema: ApiRequestStatSchema }])],
    providers: [ApiRequestStatService],
})
export class ApiRequestStatModule {}
