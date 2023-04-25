import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailErrorDto } from './mail.error.dto';
import { ISendMailOptions } from '@nestjs-modules/mailer/dist/interfaces/send-mail-options.interface';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    constructor(private readonly mailerService: MailerService, private configService: ConfigService) {}
    async sendErrorMessage(dto: MailErrorDto): Promise<void> {
        await this.send({
            to: await this.configService.get<string>('MAIL_ADMIN'),
            // from: '"Support Team" <support@example.com>', // override default from
            subject: 'Shit happened',
            template: 'error_message', // `.hbs` extension is appended automatically
            context: dto,
        });
    }
    private async send(options: ISendMailOptions): Promise<void> {
        try {
            await this.mailerService.sendMail(options);
        } catch (e) {
            this.logger.error(e.message);
        }
    }
}
