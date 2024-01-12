import {Global, Module} from '@nestjs/common';
import {RedisService} from './redis.service';
import {ConfigService} from "@nestjs/config";
import {createClient} from "redis";
import {REDIS_SERVICE_PROVIDE} from "@/common/constant";

@Global()
@Module({
    providers: [
        RedisService,
        {
            provide: REDIS_SERVICE_PROVIDE,
            async useFactory(configService: ConfigService) {
                const client = createClient({
                    socket:  {
                        host: configService.get<string>('REDIS_HOST'),
                        port: configService.get<number>('REDIS_PORT')
                    },
                    database: configService.get('REDIS_DB')
                })

                await client.connect()
                return client
            },
            inject: [ConfigService]
        }
    ],
    exports: [RedisService]
})
export class RedisModule {
}
