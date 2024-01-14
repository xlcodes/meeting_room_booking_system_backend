import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Query,
    UnauthorizedException
} from '@nestjs/common';
import {UserService} from './user.service';
import {RegisterUserDto} from "@/user/dto/register-user.dto";
import {s8} from "@/utils";
import {EmailService} from "@/email/email.service";
import {RedisService} from "@/redis/redis.service";
import {
    REDIS_SMS_CODE_PREFIX,
    REDIS_SMS_CODE_RESET_PASSWORD_PREFIX,
    REDIS_SMS_CODE_UPDATE_USER_INFO_PREFIX
} from "@/common/constant";
import {LoginUserDto} from "@/user/dto/login-user.dto";
import {JwtService} from "@nestjs/jwt";
import {ConfigService} from "@nestjs/config";
import {UserAccessTokenOpt, UserRefreshTokenOpt} from "@/user/interface";
import {RequireLogin, RequirePermission, UserInfo} from "@/common/decorator/custom.decorator";
import {UserDetailVo} from "@/user/vo/detail-user.vo";
import {UpdateUserPasswordDto} from "@/user/dto/update-user-password.dto";
import {UpdateUserDto} from "@/user/dto/udpate-user.dto";

@Controller('user')
export class UserController {
    @Inject(UserService)
    private readonly userService: UserService

    @Inject(EmailService)
    private emailService: EmailService

    @Inject(RedisService)
    private redisService: RedisService

    @Inject(JwtService)
    private jwtService: JwtService

    @Inject(ConfigService)
    private configService: ConfigService

    private getAccessToken(opt: UserAccessTokenOpt) {
        return this.jwtService.sign(opt, {
            expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRE_TIME') || '30m'
        })
    }

    private getRefreshToken(opt: UserRefreshTokenOpt) {
        return this.jwtService.sign(opt, {
            expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRE_TIME') || '7d'
        })
    }

    @Post('register')
    async register(@Body() registerUser: RegisterUserDto) {
        return await this.userService.register(registerUser)
    }

    @Get('register-captcha')
    async registerCaptcha(@Query('address') address: string) {
        // TODO: 邮箱验证码应当做接口限流
        if (!address) {
            throw new HttpException('请输入邮箱地址', HttpStatus.BAD_REQUEST)
        }

        const redisCode = await this.redisService.get(`${REDIS_SMS_CODE_PREFIX}_${address}`)

        if (redisCode) {
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

    @Get('init-data')
    async initData() {
        await this.userService.initData()
        return 'done'
    }

    @Post('login')
    async login(@Body() loginUser: LoginUserDto) {
        const user = await this.userService.login(loginUser, false)

        user.accessToken = this.getAccessToken({
            userId: user.userInfo.id,
            username: user.userInfo.username,
            roles: user.userInfo.roles,
            permissions: user.userInfo.permissions,
        })

        user.refreshToken = this.getRefreshToken({
            userId: user.userInfo.id
        })

        return user
    }

    @Post('admin/login')
    async adminLogin(@Body() loginUser: LoginUserDto) {
        const user = await this.userService.login(loginUser, true)

        user.accessToken = this.getAccessToken({
            userId: user.userInfo.id,
            username: user.userInfo.username,
            roles: user.userInfo.roles,
            permissions: user.userInfo.permissions,
        })

        user.refreshToken = this.getRefreshToken({
            userId: user.userInfo.id
        })

        return user
    }

    @Get('refresh')
    async refresh(@Query('refreshToken') refreshToken: string) {

        if (!refreshToken) {
            throw new HttpException('token不存在', HttpStatus.BAD_REQUEST)
        }

        try {
            const data = this.jwtService.verify(refreshToken)
            const user = await this.userService.findUserById(data.userId, false)

            const access_token = this.getAccessToken({
                userId: user.id,
                username: user.username,
                roles: user.roles,
                permissions: user.permissions
            })

            const refresh_token = this.getRefreshToken({
                userId: user.id
            })

            return {
                access_token,
                refresh_token
            }

        } catch (err) {
            console.log(err)
            throw new UnauthorizedException("token 已失效, 请重新登录！")
        }
    }

    @Get('admin/refresh')
    async adminRefresh(@Query('refreshToken') refreshToken: string) {

        if (!refreshToken) {
            throw new HttpException('token不存在', HttpStatus.BAD_REQUEST)
        }

        try {
            const data = this.jwtService.verify(refreshToken)
            const user = await this.userService.findUserById(data.userId, true)

            const access_token = this.getAccessToken({
                userId: user.id,
                username: user.username,
                roles: user.roles,
                permissions: user.permissions
            })

            const refresh_token = this.getRefreshToken({
                userId: user.id
            })

            return {
                access_token,
                refresh_token
            }

        } catch (err) {
            console.log(err)
            throw new UnauthorizedException("token 已失效, 请重新登录！")
        }
    }

    @Get('info')
    @RequireLogin()
    async info(@UserInfo('userId') userId: number) {
        const user = await this.userService.findUserDetailById(userId)

        const vo = new UserDetailVo()
        vo.id = user.id
        vo.email = user.email
        vo.username = user.username
        vo.nickName = user.nickName
        vo.headPic = user.headPic
        vo.phoneNumber = user.phoneNumber
        vo.isFrozen = user.isFrozen
        vo.createTime = user.createTime
        vo.updateTime = user.updateTime

        return vo
    }

    @Post(['update_password', 'admin/update_password'])
    @RequireLogin()
    async updatePassword(@UserInfo('userId') userId: number, @Body() passwordDto: UpdateUserPasswordDto) {
        return await this.userService.updatePassword(userId, passwordDto)
    }

    @Get('update_password/captcha')
    async updatePasswordCaptcha(@Query('address') address: string) {
        if (!address) {
            throw new HttpException('请输入邮箱地址', HttpStatus.BAD_REQUEST)
        }

        const redisUpdatePasswordCode = await this.redisService.get(`${REDIS_SMS_CODE_RESET_PASSWORD_PREFIX}_${address}`)

        if (redisUpdatePasswordCode) {
            throw new HttpException('验证码已发送，请勿频繁操作', HttpStatus.BAD_REQUEST)
        }

        const code = s8().padEnd(8, '0')

        // 邮箱验证码有效期 10 分钟
        await this.redisService.set(`${REDIS_SMS_CODE_RESET_PASSWORD_PREFIX}_${address}`, code, 10 * 60)

        await this.emailService.sendEmail({
            to: address,
            subject: '会议室预约系统-修改密码验证码',
            html: `<p>您的验证码是：${code}，有效期 10 分钟！</p>`
        })

        return '验证码发送成功！'
    }

    @Get('update/captcha')
    async updateCaptcha(@Query('address') address: string) {
        if (!address) {
            throw new HttpException('请输入邮箱地址', HttpStatus.BAD_REQUEST)
        }

        const redisUpdateCode = await this.redisService.get(`${REDIS_SMS_CODE_UPDATE_USER_INFO_PREFIX}_${address}`)

        if (redisUpdateCode) {
            throw new HttpException('验证码已发送，请勿频繁操作', HttpStatus.BAD_REQUEST)
        }

        const code = s8().padEnd(8, '0')

        // 邮箱验证码有效期 10 分钟
        await this.redisService.set(`${REDIS_SMS_CODE_UPDATE_USER_INFO_PREFIX}_${address}`, code, 10 * 60)

        await this.emailService.sendEmail({
            to: address,
            subject: '会议室预约系统-修改用户信息验证码',
            html: `<p>您的验证码是：${code}，有效期 10 分钟！</p>`
        })

        return '验证码发送成功！'
    }

    @Post(['update', 'admin/update'])
    @RequireLogin()
    async update(@UserInfo('userId') userId: number, @Body() updateUserDto: UpdateUserDto) {
        return await this.userService.update(userId, updateUserDto)
    }

    @Get('aaa')
    @RequireLogin()
    @RequirePermission('ccc')
    aaa(@UserInfo('username') usernmae: string, @UserInfo() userInfo) {
        // console.log(usernmae)
        // console.log(userInfo)
        return 'aaa'
    }

    @Get('bbb')
    bbb() {
        return 'bbb'
    }
}
