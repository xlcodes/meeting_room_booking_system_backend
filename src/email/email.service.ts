import { Injectable } from '@nestjs/common';
import { createTransport, Transporter, SendMailOptions} from 'nodemailer';
import {ConfigService} from "@nestjs/config";

@Injectable()
export class EmailService {
    transporter: Transporter;
    constructor(private configService: ConfigService) {
        this.transporter = createTransport({
            host: this.configService.get('NODE_MAILER_HOST'),
            port: this.configService.get('NODE_MAILER_PORT'),
            secure: false,
            ignoreTLS: true,
            auth: {
                user: this.configService.get('NODE_MAILER_AUTH_USER'),
                pass: this.configService.get('NODE_MAILER_AUTH_PASS'),
            }
        })
    }

    async sendEmail(opt: SendMailOptions) {
        await this.transporter.sendMail({
            from: {
                name: '会议室预定系统',
                address: this.configService.get('NODE_MAILER_AUTH_USER'),
            },
            to: opt.to,
            subject: opt.subject,
            html: opt.html,
        })
    }
}
