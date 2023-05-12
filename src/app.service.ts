import { Injectable } from '@nestjs/common';
import { MailService } from './mail/mail.service';

@Injectable()
export class AppService {
    constructor(private mailService: MailService) {}
    getHello(): any {
        return { message: 'Hello People!' };
    }
    testMail(): Promise<boolean> {
        return this.mailService.sendTestMessage();
    }
}
