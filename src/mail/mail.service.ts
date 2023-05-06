import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailErrorDto } from './mail.error.dto';
import { ISendMailOptions } from '@nestjs-modules/mailer/dist/interfaces/send-mail-options.interface';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    constructor(private readonly mailerService: MailerService, private configService: ConfigService) {}
    async sendErrorMessage(dto: MailErrorDto): Promise<boolean> {
        return this.send({
            to: await this.configService.get<string>('MAIL_ADMIN'),
            // from: '"Support Team" <support@example.com>', // override default from
            subject: 'Shit happened in ' + dto.module + ' module!',
            template: 'error_message', // `.hbs` extension is appended automatically
            context: dto,
        });
    }
    async sendTestMessage(): Promise<boolean> {
        return this.send({
            to: await this.configService.get<string>('MAIL_ADMIN'),
            subject: 'Test message!',
            template: 'test_message', // `.hbs` extension is appended automatically
            context: { test: 'Nothing important ' },
        });
    }
    private async send(options: ISendMailOptions): Promise<boolean> {
        try {
            await this.mailerService.sendMail(options);
            return true;
        } catch (e) {
            this.logger.error(e.message);
            return false;
        }
    }
}
