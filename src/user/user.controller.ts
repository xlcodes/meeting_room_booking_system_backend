import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    DefaultValuePipe,
    Post,
    Query,
    UnauthorizedException
} from '@nestjs/common';
import {UserService} from './user.service';
import {RegisterUserDto} from "@/user/dto/register-user.dto";
import {generateParseIntPipe, s8} from "@/utils";
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
import {ApiBearerAuth, ApiBody, ApiQuery, ApiResponse, ApiTags} from "@nestjs/swagger";
import {LoginUserVo} from "@/user/vo/login-user.vo";
import {RefreshTokenVo} from "@/user/vo/refresh-token.vo";
import {UserListVo} from "@/user/vo/user-list.vo";

@ApiTags('用户管理模块')
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

    @ApiBody({ type: RegisterUserDto })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '验证码已失效/验证码不正确/用户已存在',
        type: String
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '注册成功/失败',
        type: String
    })
    @Post('register')
    async register(@Body() registerUser: RegisterUserDto) {
        return await this.userService.register(registerUser)
    }

    @ApiQuery({
        name: 'address',
        type: String,
        description: '邮箱地址',
        required: true,
        example: 'xiaolin201809@126.com'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '发送成功',
        type: String
    })
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

    @ApiBody({ type: LoginUserDto })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '用户不存在/密码错误',
        type: String
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '用户信息和 token',
        type: LoginUserVo
    })
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

    @ApiBody({ type: LoginUserDto })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '用户不存在/密码错误',
        type: String
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '用户信息和 token',
        type: LoginUserVo
    })
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

    @ApiQuery({
        name: 'refreshToken',
        required: true,
        description: '刷新 token',
        type: String,
        example: 'xxxxxx.xxxxxx.xxxxxx'
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'token 已失效，请重新登录',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '刷新成功',
        type: RefreshTokenVo
    })
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

            const vo = new RefreshTokenVo()
            vo.access_token = access_token
            vo.refresh_token = refresh_token

            return vo
        } catch (err) {
            console.log(err)
            throw new UnauthorizedException("token 已失效, 请重新登录！")
        }
    }

    @ApiQuery({
        name: 'refreshToken',
        required: true,
        description: '刷新 token',
        type: String,
        example: 'xxxxxx.xxxxxx.xxxxxx'
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'token 已失效，请重新登录',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '刷新成功',
        type: RefreshTokenVo
    })
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

            const vo = new RefreshTokenVo()
            vo.refresh_token = refresh_token
            vo.access_token =access_token

            return vo
        } catch (err) {
            console.log(err)
            throw new UnauthorizedException("token 已失效, 请重新登录！")
        }
    }

    @ApiBearerAuth()
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'success',
        type: UserDetailVo
    })
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

    @ApiBearerAuth()
    @ApiBody({
        type: UpdateUserPasswordDto
    })
    @ApiResponse({
        type: String,
        description: '验证码已失效/不正确'
    })
    @Post(['update_password', 'admin/update_password'])
    @RequireLogin()
    async updatePassword(@UserInfo('userId') userId: number, @Body() passwordDto: UpdateUserPasswordDto) {
        return await this.userService.updatePassword(userId, passwordDto)
    }

    @ApiBearerAuth()
    @ApiQuery({
        name: 'address',
        description: '邮箱地址',
        type: String
    })
    @ApiResponse({
        type: String,
        description: '发送成功'
    })
    @Get('update_password/captcha')
    @RequireLogin()
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

    @ApiBearerAuth()
    @ApiBody({
        type: UpdateUserDto
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '验证码已失效/不正确'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '更新成功',
        type: String
    })
    @Post(['update', 'admin/update'])
    @RequireLogin()
    async update(@UserInfo('userId') userId: number, @Body() updateUserDto: UpdateUserDto) {
        return await this.userService.update(userId, updateUserDto)
    }

    @ApiBearerAuth()
    @ApiQuery({
        name: 'id',
        description: 'userId',
        type: Number
    })
    @ApiResponse({
        type: String,
        description: 'success'
    })
    @RequireLogin()
    @Get('freeze')
    @RequireLogin()
    async freeze(@Query('id') userId: number) {
        return await this.userService.freezeById(userId)
    }

    @ApiBearerAuth()
    @ApiQuery({
        name: 'pageNo',
        description: '第几页',
        type: Number
    })
    @ApiQuery({
        name: 'pageSize',
        description: '每页多少条',
        type: Number
    })
    @ApiQuery({
        name: 'username',
        description: '用户名',
        type: Number
    })
    @ApiQuery({
        name: 'nickName',
        description: '昵称',
        type: Number
    })
    @ApiQuery({
        name: 'email',
        description: '邮箱地址',
        type: Number
    })
    @ApiResponse({
        type: UserListVo,
        description: '用户列表'
    })
    @RequireLogin()
    @Get('list')
    async list(
        @Query('pageNo', new DefaultValuePipe(1), generateParseIntPipe('pageNo')) pageNo: number,
        @Query('pageSize', new DefaultValuePipe(2), generateParseIntPipe('pageSize')) pageSize: number,
        @Query('username') username?: string,
        @Query('email') email?: string,
        @Query('nickName') nickName?: string,
    ) {
        return await this.userService.findUsersByPage({pageNo, pageSize, username, email, nickName})
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
