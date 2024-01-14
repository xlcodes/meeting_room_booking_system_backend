import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {ConfigService} from "@nestjs/config";
import {ValidationPipe} from "@nestjs/common";
import {FormatResponseInterceptor} from "@/common/interceptor/format-response.interceptor";
import {InvokeRecordInterceptor} from "@/common/interceptor/invoke-record.interceptor";
import {UnLoginFilter} from "@/common/filter/unlogin.filter";
import {CustomExceptionFilter} from "@/common/filter/custom-exception.filter";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService: any = app.get(ConfigService);

  // 全局参数校验
  app.useGlobalPipes(new ValidationPipe())
  // 响应内容拦截器
  app.useGlobalInterceptors(new FormatResponseInterceptor())
  // 接口访问记录
  app.useGlobalInterceptors(new InvokeRecordInterceptor())

  app.useGlobalFilters(new UnLoginFilter())
  app.useGlobalFilters(new CustomExceptionFilter())

  const config = new DocumentBuilder()
      .setTitle('会议室预定系统')
      .setDescription('API接口文档')
      .setVersion('1.0.0')
      .addBearerAuth({
        type: 'http',
        description: '基于 JWT 的认证'
      })
      .build()
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document)

  await app.listen(configService.get('SERVER_PORT'), () => {
    console.log(`服务启动在 ${configService.get('SERVER_PORT')} 端口！`)
  });
}
bootstrap();
