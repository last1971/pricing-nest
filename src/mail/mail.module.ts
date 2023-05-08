import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { BullModule } from '@nestjs/bull';
import { MAIL_QUEUE } from './mail.constants';

@Global()
@Module({
    imports: [
        MailerModule.forRootAsync({
            useFactory: async (config: ConfigService) => ({
                transport: {
                    host: config.get('MAIL_HOST'),
                    secure: true,
                    port: config.get('MAIL_PORT', 465),
                    auth: {
                        user: config.get('MAIL_USER'),
                        pass: config.get('MAIL_PASSWORD'),
                    },
                    logger: config.get('MAIL_LOG', 'false') === 'true',
                    debug: config.get('MAIL_DEBUG', 'false') === 'true',
                },
                defaults: {
                    from: `"No Reply" <${config.get('MAIL_FROM')}>`,
                },
                template: {
                    dir: join(__dirname, 'templates'),
                    adapter: new HandlebarsAdapter(),
                    options: {
                        strict: false,
                    },
                },
            }),
            inject: [ConfigService],
        }),
        BullModule.registerQueue({
            name: MAIL_QUEUE,
        }),
    ],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule {}
