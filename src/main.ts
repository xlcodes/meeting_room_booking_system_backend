import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {ConfigService} from "@nestjs/config";
import {ValidationPipe} from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService: any = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe())

  await app.listen(configService.get('SERVER_PORT'), () => {
    console.log(`服务启动在 ${configService.get('SERVER_PORT')} 端口！`)
  });
}
bootstrap();
