import { Module } from '@nestjs/common';
import { UnitService } from './unit.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Unit, UnitSchema } from './unit.schema';
import { UnitSeed } from './unit.seed';

@Module({
    exports: [UnitService, UnitSeed],
    imports: [MongooseModule.forFeature([{ name: Unit.name, schema: UnitSchema }])],
    providers: [UnitService, UnitSeed],
})
export class UnitModule {}
