import {Module} from '@nestjs/common';
import {TypeOrmModule, TypeOrmModuleAsyncOptions} from "@nestjs/typeorm";
import {ConfigModule, ConfigService} from "@nestjs/config";
import { UserModule } from './user/user.module';
import {User} from '@/user/entities/user.entity'
import {Role} from '@/user/entities/role.entity'
import {Permission} from '@/user/entities/permission.entity'
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';

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
                    entities: [User, Role, Permission],
                    poolSize: 10,
                    connectorPackage: 'mysql2'
                }
            },
            inject: [ConfigService]
        } as TypeOrmModuleAsyncOptions),
        UserModule,
        RedisModule,
        EmailModule,
    ],
})
export class AppModule {
}
