import {Inject, Injectable} from '@nestjs/common';
import {REDIS_SERVICE_PROVIDE} from "@/common/constant";
import {RedisClientType} from "redis";

@Injectable()
export class RedisService {
    @Inject(REDIS_SERVICE_PROVIDE)
    private redisClient: RedisClientType

    async get(key: string) {
        return await this.redisClient.get(key as any)
    }

    async set(key: string, value: string | number, ttl?: number) {
        await this.redisClient.set(key as any, value as any)

        if(ttl) {
            await this.redisClient.expire(key as any, ttl as any)
        }
    }
}
