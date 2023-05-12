import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiRequestStat, ApiRequestStatDocument } from './api.request.stat.schema';
import { Model } from 'mongoose';
import { ApiRequestStatDto } from './api.request.stat.dto';
import { SupplierDto } from '../supplier/supplier.dto';
import { DateTime } from 'luxon';

@Injectable()
export class ApiRequestStatService {
    constructor(@InjectModel(ApiRequestStat.name) private model: Model<ApiRequestStatDocument>) {}
    async create(dto: ApiRequestStatDto): Promise<void> {
        await this.model.create(dto);
    }
    async duration(): Promise<Map<string, number>> {
        const res = await this.model.aggregate([
            { $match: { isSuccess: true } },
            {
                $group: {
                    _id: '$supplier',
                    duration: { $avg: '$duration' },
                },
            },
        ]);
        return res.reduce((map, value) => map.set(value._id, value.duration), new Map<string, number>());
    }
    async todayErrorCount(supplier: SupplierDto): Promise<number> {
        const res = await this.model.countDocuments({
            supplier: supplier.id,
            isSuccess: false,
            dateTime: { $gt: DateTime.now().startOf('day') },
        });
        return res + 1;
    }
}
