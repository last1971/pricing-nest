import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiRequestStat, ApiRequestStatDocument } from './api.request.stat.schema';
import { Model } from 'mongoose';
import { ApiRequestStatDto } from './api.request.stat.dto';

@Injectable()
export class ApiRequestStatService {
    constructor(@InjectModel(ApiRequestStat.name) private model: Model<ApiRequestStatDocument>) {}
    async create(dto: ApiRequestStatDto): Promise<void> {
        await this.model.create(dto);
    }
}
