import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Unit, UnitDocument } from './unit.schema';
import { Model } from 'mongoose';
import unit from './unit.json';
import { UnitSeedDto } from './dtos/unit.seed.dto';
import { UnitCreateDto } from './dtos/unit.create.dto';
import { flatten } from 'lodash';

@Injectable()
export class UnitSeed implements ICommand {
    private unit: UnitSeedDto[];
    constructor(@InjectModel(Unit.name) private unitModel: Model<UnitDocument>) {
        this.unit = unit;
    }
    async seed(dtos: UnitSeedDto[]): Promise<void> {
        const units = dtos.map(async (dto: UnitSeedDto) => {
            const baseUnit = await this.unitModel.findOneAndUpdate(dto.baseUnit, {}, { new: true, upsert: true });
            return (dto.units ?? []).map((unit: UnitCreateDto) => {
                unit.baseUnit = baseUnit._id;
                return this.unitModel.findOneAndUpdate(unit, {}, { new: true, upsert: true });
            });
        });
        await Promise.all(flatten(await Promise.all(units)));
    }

    async execute(): Promise<void> {
        await this.seed(this.unit);
    }
}
