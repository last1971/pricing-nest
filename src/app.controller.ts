import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}
    @ApiOkResponse({
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'Hello People!',
                },
            },
        },
        description: '200. Success. Returns a user',
    })
    @Get()
    getHello(): any {
        return this.appService.getHello();
    }
    // @Get('test-mail')
    // async testMail(): Promise<string> {
    //    return (await this.appService.testMail()) ? 'Success' : 'Failure';
    // }
}
