// src/middlewares/logger.middleware.ts
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Pour capter les erreurs, on utilise res.locals.error (défini dans ton middleware d'erreur)
    res.on("finish", () => {
        const duration = Date.now() - start;

        const logData = {
            ip: req.ip,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
        };


        // Si une erreur a été stockée dans res.locals.error
        if (res.locals.error instanceof Error) {
            logger.error({
                ...logData,
                errorMessage: res.locals.error.message,
            }, `${req.method} ${req.originalUrl} failed`);
        } else {
            logger.info(logData, `📥 ${req.method} ${req.originalUrl}`);
        }
    });

    next();
};
