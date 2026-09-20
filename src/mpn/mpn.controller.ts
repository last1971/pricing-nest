import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { MpnService } from './mpn.service';
import { MpnBlockedDto, MpnPartDto } from './dtos/mpn.part.dto';
import { MpnPartQueryDto } from './dtos/mpn.part.query.dto';

@ApiTags('mpn')
@Controller('mpn')
export class MpnController {
    constructor(private readonly service: MpnService) {}

    @ApiOkResponse({
        description: 'Справочная карточка детали с mpn.cc (found=false — не нашлось, см. candidates)',
        type: MpnPartDto,
    })
    @ApiServiceUnavailableResponse({ description: 'mpn.cc отдал 429, молчим до blockedUntil', type: MpnBlockedDto })
    @ApiBadGatewayResponse({ description: 'mpn.cc недоступен или ответил не по контракту' })
    @Get('part')
    async part(@Query() query: MpnPartQueryDto): Promise<MpnPartDto> {
        return this.service.part(query.q, query.manufacturer);
    }
}
