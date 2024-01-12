import {Body, Controller, Get, HttpException, HttpStatus, Inject, Post, Query} from '@nestjs/common';
import { UserService } from './user.service';
import {RegisterUserDto} from "@/user/dto/register-user.dto";
import {s8} from "@/utils";
import {EmailService} from "@/email/email.service";
import {RedisService} from "@/redis/redis.service";
import {REDIS_SMS_CODE_PREFIX} from "@/common/constant";

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Inject(EmailService)
  private emailService: EmailService

  @Inject(RedisService)
  private redisService: RedisService

  @Post('register')
  async register(@Body() registerUser: RegisterUserDto) {
    return await this.userService.register(registerUser)
  }

  @Get('register-captcha')
  async registerCaptcha(@Query('address') address: string) {
    // TODO: 邮箱验证码应当做接口限流
    if(!address) {
      throw new HttpException('请输入邮箱地址', HttpStatus.BAD_REQUEST)
    }

    const redisCode = await this.redisService.get(`${REDIS_SMS_CODE_PREFIX}_${address}`)

    if(redisCode) {
      throw new HttpException('验证码已发送，请勿频繁操作', HttpStatus.BAD_REQUEST)
    }

    const code = s8().padEnd(8, '0')

    // 邮箱验证码有效期 5 分钟
    await this.redisService.set(`${REDIS_SMS_CODE_PREFIX}_${address}`, code, 5 * 60)

    await this.emailService.sendEmail({
      to: address,
      subject: '会议室预约系统-注册验证码',
      html: `<p>您的验证码是：${code}，有效期 5 分钟！</p>`
    })

    return '验证码发送成功！'
  }
}
