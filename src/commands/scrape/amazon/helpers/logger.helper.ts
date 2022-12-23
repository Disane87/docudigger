import * as path from 'path';
import winston, { format } from "winston";
const { timestamp, printf } = format;
const myFormat = printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
});

export const createLogger = (logLevel: string, logPath: string) => winston.createLogger({
    level: logLevel.toString(),
    // defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: path.join(logPath, `error.log`).normalize(), level: `error` }),
        new winston.transports.File({ filename: path.join(logPath, `verbose.log`).normalize(), level: `verbose` }),
        new winston.transports.File({ filename: path.join(logPath, `combined.log`).normalize() }),
        new winston.transports.Console({
            format: winston.format.combine(
                // label({ label: `amazon-invoice-craper` }),
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.splat(),
                timestamp(),
                myFormat
            )
        }),
    ],
});