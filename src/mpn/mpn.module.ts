import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MpnController } from './mpn.controller';
import { MpnService } from './mpn.service';
import { MpnClient } from './mpn.client';

@Module({
    imports: [HttpModule],
    providers: [MpnClient, MpnService],
    exports: [MpnService],
    controllers: [MpnController],
})
export class MpnModule {}
