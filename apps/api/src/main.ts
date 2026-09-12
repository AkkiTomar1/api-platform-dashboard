import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { RequestLoggerMiddleware } from "./core/middleware/request-logger.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");

  app.use(helmet());

  app.enableCors({
    credentials: true,
    origin: (origin, cb) => {
      if (!origin) {
        return cb(null, true);
      }
      if (/^http:\/\/localhost:\d+$/.test(origin)) {
        return cb(null, true);
      }
      return cb(null, true);
    },
  });

  app.use(new RequestLoggerMiddleware().use);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
