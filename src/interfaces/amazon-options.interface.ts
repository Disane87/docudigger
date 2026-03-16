import { LogLevel } from "../enums/loglevel";
import { OtpOptions } from "./otp.interface";

export type AmazonOptions = {
    logLevel: LogLevel,
    debug: boolean,
    logPath: string,
    recurring: boolean,
    recurringCron: string,
    username: string,
    password: string,
    fileDestinationFolder: string,
    fileFallbackExentension: string,
    tld: string,
    yearFilter: number,
    pageFilter: number,
    onlyNew: boolean,
    subFolderForPages: boolean,
} & OtpOptions
