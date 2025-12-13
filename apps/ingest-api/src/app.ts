// src/app.ts
import { logger } from "./utils/logger.js";
import express from "express";
import { AppDataSource } from "./config/database.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { loggerMiddleware } from "./middlewares/logger.middleware.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import router from "./routes/index.js";


const app = express();
app.set('trust proxy', true);

app.use(express.json());
app.use(cookieParser());
app.use(loggerMiddleware);


app.use(
    cors({
        origin: env.corsOrigin,
        credentials: true,
    })
);

app.use("/api/v1", router);
app.use(errorHandler);


logger.info(`🟢 Environment: ${env.node_env}`);

AppDataSource.initialize()
    .then(() => {
        app.listen(env.port, () => {
            logger.info(`🚀 Server running on http://localhost:${env.port}`);
        });
    })
    .catch((error) => {
        logger.error({ err: error }, "❌ Error starting server");
    });
