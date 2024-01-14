import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {ConfigService} from "@nestjs/config";
import {ValidationPipe} from "@nestjs/common";
import {FormatResponseInterceptor} from "@/common/interceptor/format-response.interceptor";
import {InvokeRecordInterceptor} from "@/common/interceptor/invoke-record.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService: any = app.get(ConfigService);

  // 全局参数校验
  app.useGlobalPipes(new ValidationPipe())
  // 响应内容拦截器
  app.useGlobalInterceptors(new FormatResponseInterceptor())
  // 接口访问记录
  app.useGlobalInterceptors(new InvokeRecordInterceptor())

  await app.listen(configService.get('SERVER_PORT'), () => {
    console.log(`服务启动在 ${configService.get('SERVER_PORT')} 端口！`)
  });
}
bootstrap();
