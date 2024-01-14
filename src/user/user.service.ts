import {HttpException, HttpStatus, Inject, Injectable, Logger, Query} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {User} from "@/user/entities/user.entity";
import {Like, Repository} from "typeorm";
import {RedisService} from "@/redis/redis.service";
import {
    REDIS_SMS_CODE_PREFIX,
    REDIS_SMS_CODE_RESET_PASSWORD_PREFIX,
    REDIS_SMS_CODE_UPDATE_USER_INFO_PREFIX
} from "@/common/constant";
import {RegisterUserDto} from "@/user/dto/register-user.dto";
import {md5} from "@/utils";
import {Role} from "@/user/entities/role.entity";
import {Permission} from "@/user/entities/permission.entity";
import {LoginUserDto} from "@/user/dto/login-user.dto";
import {LoginUserVo} from "@/user/vo/login-user.vo";
import {UpdateUserPasswordDto} from "@/user/dto/update-user-password.dto";
import {UpdateUserDto} from "@/user/dto/udpate-user.dto";
import {FindUsersByPageParams} from "@/user/interface";
import {FindManyOptions} from "typeorm/find-options/FindManyOptions";

@Injectable()
export class UserService {
    private logger = new Logger()

    @InjectRepository(User)
    private userRepository: Repository<User>;

    @InjectRepository(Role)
    private roleRepository: Repository<Role>;

    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>;

    @Inject(RedisService)
    private redisService: RedisService;

    async register(user: RegisterUserDto) {
        const captcha = await this.redisService.get(`${REDIS_SMS_CODE_PREFIX}_${user.email}`)

        if (!captcha || user.captcha !== captcha) {
            throw new HttpException('验证码已过期或者不正确！', HttpStatus.BAD_REQUEST)
        }

        const foundUser = await this.userRepository.findOneBy({
            username: user.username
        })

        if (foundUser) {
            throw new HttpException('用户已存在！', HttpStatus.BAD_REQUEST)
        }

        const newUser = new User()
        newUser.username = user.username
        newUser.password = md5(user.password)
        newUser.email = user.email
        newUser.nickName = user.nickName

        try {
            await this.userRepository.save(newUser)
            return '注册成功'
        } catch (e) {
            this.logger.error(e, UserService)
            throw new HttpException('注册失败！', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    async initData() {
        const user1 = new User();
        user1.username = "zhangsan";
        user1.password = md5("111111");
        user1.email = "xxx@xx.com";
        user1.isAdmin = true;
        user1.nickName = '张三';
        user1.phoneNumber = '13233323333';

        const user2 = new User();
        user2.username = 'lisi';
        user2.password = md5("222222");
        user2.email = "yy@yy.com";
        user2.nickName = '李四';

        const role1 = new Role();
        role1.name = '管理员';

        const role2 = new Role();
        role2.name = '普通用户';

        const permission1 = new Permission();
        permission1.code = 'ccc';
        permission1.description = '访问 ccc 接口';

        const permission2 = new Permission();
        permission2.code = 'ddd';
        permission2.description = '访问 ddd 接口';

        user1.roles = [role1];
        user2.roles = [role2];

        role1.permissions = [permission1, permission2];
        role2.permissions = [permission1];

        await this.permissionRepository.save([permission1, permission2]);
        await this.roleRepository.save([role1, role2]);
        await this.userRepository.save([user1, user2]);
    }

    async login(loginUserDto: LoginUserDto, isAdmin: boolean) {
        const user = await this.userRepository.findOne({
            where: {
                username: loginUserDto.username,
                isAdmin
            },
            relations: ['roles', 'roles.permissions']
        })

        if (!user) {
            throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST)
        }

        if (user.password !== md5(loginUserDto.password)) {
            throw new HttpException('密码错误', HttpStatus.BAD_REQUEST)
        }

        const userVo = new LoginUserVo()

        userVo.userInfo = {
            id: user.id,
            username: user.username,
            nickName: user.nickName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            headPic: user.headPic,
            isAdmin: user.isAdmin,
            createTime: user.createTime,
            updateTime: user.updateTime,
            isFrozen: user.isFrozen,
            roles: user.roles.map(item => item.name),
            permissions: user.roles.reduce((arr, item) => {
                item.permissions.forEach(permission => {
                    if (arr.indexOf(permission) === -1) {
                        arr.push(permission)
                    }
                })
                return arr
            }, [])
        }

        return userVo
    }

    async findUserById(userId: number, isAdmin: boolean) {
        const user = await this.userRepository.findOne({
            where: {
                id: userId,
                isAdmin
            },
            relations: ['roles', 'roles.permissions']
        })

        return {
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            roles: user.roles.map(item => item.name),
            permissions: user.roles.reduce((arr, item) => {
                item.permissions.forEach(permission => {
                    if (arr.indexOf(permission) === -1) {
                        arr.push(permission)
                    }
                })
                return arr
            }, [])
        }
    }

    async findUserDetailById(userId: number) {
        return await this.userRepository.findOne({
            where: {
                id: userId
            }
        })
    }

    async updatePassword(userId: number, passwordDto: UpdateUserPasswordDto) {
        const captcha = await this.redisService.get(`${REDIS_SMS_CODE_RESET_PASSWORD_PREFIX}_${passwordDto.email}`)

        if (!captcha) {
            throw new HttpException('验证码已过期', HttpStatus.BAD_REQUEST)
        }

        if (passwordDto.captcha !== captcha) {
            throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST)
        }

        const foundUser = await this.userRepository.findOneBy({
            id: userId
        })

        foundUser.password = md5(passwordDto.password)

        try {
            await this.userRepository.save(foundUser)
            return '密码修改成功！'
        } catch (err) {
            console.log(err)
            this.logger.error(err, UserService)
            return '密码修改失败！'
        }
    }

    async update(userId: number, updateUserDto: UpdateUserDto) {
        const captcha = await this.redisService.get(`${REDIS_SMS_CODE_UPDATE_USER_INFO_PREFIX}_${updateUserDto.email}`)

        if (!captcha) {
            throw new HttpException('验证码已过期', HttpStatus.BAD_REQUEST)
        }

        if (updateUserDto.captcha !== captcha) {
            throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST)
        }

        const foundUser = await this.userRepository.findOneBy({
            id: userId
        })

        if (updateUserDto.nickName) {
            foundUser.nickName = updateUserDto.nickName
        }

        if (updateUserDto.headPic) {
            foundUser.headPic = updateUserDto.headPic
        }

        try {
            await this.userRepository.save(foundUser)
            return '用户信息修改成功！'
        } catch (err) {
            this.logger.error(err, UserService)
            return '用户信息修改失败！'
        }
    }

    async freezeById(id: number) {
        const foundUser = await this.userRepository.findOneBy({
            id: id
        })

        foundUser.isFrozen = true

        try {
            await this.userRepository.save(foundUser)
            return '冻结用户成功！'
        } catch (err) {
            this.logger.error(err, UserService)
            return '冻结用户失败！'
        }
    }

    async findUsersByPage(params: FindUsersByPageParams) {

        const {pageNo, pageSize, username, nickName, email} = params

        const skipCount = (pageNo - 1) * pageSize

        const condition: Record<string, any> = {}

        if (username) {
            condition.username = Like(`%${username}%`)
        }

        if (nickName) {
            condition.nickName = Like(`%${nickName}%`)
        }

        if (email) {
            condition.email = Like(`%${email}%`)
        }

        const [users, totalCount] = await this.userRepository.findAndCount({
            select: ['id', 'username', 'nickName', 'email', 'phoneNumber', 'isFrozen', 'headPic', 'createTime'],
            skip: skipCount,
            take: pageSize,
            where: condition
        } as FindManyOptions);

        return {
            users,
            totalCount,
            pageNo,
            pageSize,
        }
    }
}

