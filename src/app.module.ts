import {Module} from '@nestjs/common';
import {TypeOrmModule, TypeOrmModuleAsyncOptions} from "@nestjs/typeorm";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {UserModule} from './user/user.module';
import {User} from '@/user/entities/user.entity'
import {Role} from '@/user/entities/role.entity'
import {Permission} from '@/user/entities/permission.entity'
import {RedisModule} from './redis/redis.module';
import {EmailModule} from './email/email.module';
import {JwtModule} from "@nestjs/jwt";
import {JwtModuleAsyncOptions} from "@nestjs/jwt/dist/interfaces/jwt-module-options.interface";
import {APP_GUARD} from "@nestjs/core";
import {LoginGuard} from "@/common/guard/login.guard";
import {PermissionGuard} from "@/common/guard/permission.guard";
import { MeetingRoomModule } from './meeting-room/meeting-room.module';
import {MeetingRoom} from "@/meeting-room/entities/meeting-room.entity";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: 'src/.env'
        }),
        TypeOrmModule.forRootAsync({
            useFactory(configService: ConfigService) {
                return {
                    type: "mysql",
                    host: configService.get('MYSQL_HOST'),
                    port: configService.get('MYSQL_PORT'),
                    username: configService.get('MYSQL_USER'),
                    password: configService.get('MYSQL_PASSWORD'),
                    database: configService.get('MYSQL_DB'),
                    synchronize: true,
                    logging: true,
                    entities: [User, Role, Permission, MeetingRoom],
                    poolSize: 10,
                    connectorPackage: 'mysql2'
                }
            },
            inject: [ConfigService]
        } as TypeOrmModuleAsyncOptions),
        JwtModule.registerAsync({
            global: true,
            useFactory(configService: ConfigService) {
                return {
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRE_TIME')
                    }
                }
            },
            inject: [ConfigService]
        } as JwtModuleAsyncOptions),
        UserModule,
        RedisModule,
        EmailModule,
        MeetingRoomModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: LoginGuard
        }, {
            provide: APP_GUARD,
            useClass: PermissionGuard
        }
    ]
})
export class AppModule {
}
