import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Unit, UnitDocument } from './unit.schema';
import { Model } from 'mongoose';
import { UnitDto } from './dtos/unit.dto';
import { ModelToDto } from '../decorators/modelToDto';

@Injectable()
export class UnitService {
    constructor(@InjectModel(Unit.name) private unitModel: Model<UnitDocument>) {}
    @ModelToDto(UnitDto)
    async name(name: string): Promise<UnitDto> {
        return this.unitModel.findOne({ name });
    }
}
