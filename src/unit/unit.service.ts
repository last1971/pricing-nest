import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Unit, UnitDocument } from './unit.schema';
import { Model } from 'mongoose';

@Injectable()
export class UnitService {
    constructor(@InjectModel(Unit.name) private unitModel: Model<UnitDocument>) {}
}
