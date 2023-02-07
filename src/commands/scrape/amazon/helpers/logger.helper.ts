import * as path from 'path';
import winston, { format } from "winston";
const { timestamp, printf, label } = format;


export const createLogger = (logLevel: string, logPath: string, context: string = 'DocuDigger') => {
    const logFormat = format.combine(
        format.label({ label: context }),
        format.timestamp({
            format: 'YYYY-MM-DD HH-MM:ss'
        }),
        format.prettyPrint(),
        format.colorize(),
        format.align(),
        format.printf(info => {
            return `[${info.timestamp}] [${info.label}] [${info.level}]: ${info.message}`;
        })
    );

    return winston.createLogger({
        level: logLevel.toString(),
        format: logFormat,
        transports:  [
            new winston.transports.File({ filename: path.join(logPath, `error.log`).normalize(), level: `error` }),
            new winston.transports.File({ filename: path.join(logPath, `verbose.log`).normalize(), level: `verbose` }),
            new winston.transports.File({ filename: path.join(logPath, `combined.log`).normalize() }),
            new winston.transports.Console()
        ]
    })
};