import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { MailErrorDto } from './mail.error.dto';

describe('MailService', () => {
    let service: MailService;

    const sendMail = jest.fn();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MailService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: async () => 'test@test.test',
                    },
                },
                {
                    provide: MailerService,
                    useValue: { sendMail },
                },
            ],
        }).compile();

        service = module.get<MailService>(MailService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('sendErrorMessage', async () => {
        const testDto: MailErrorDto = {
            error: 'test',
            module: 'test',
            time: 'test',
            duration: 'test',
        };
        await service.sendErrorMessage(testDto);
        expect(sendMail.mock.calls).toHaveLength(1);
        expect(sendMail.mock.calls[0][0]).toHaveProperty('context', testDto);
    });
});
