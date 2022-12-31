import { ENV, loadConfig } from 'config-decorators';
import { LogLevel } from './enums/loglevel';

export class Config {
    @ENV(`DEBUG`)
    debug = false;

    @ENV(`FILE_DESTINATION_FOLDER`)
    fileDestinationFolder = `./data/`;

    @ENV(`FILE_FALLBACK_EXTENSION`)
    fileFallbackExentension = `.pdf`;

    // Use the 'number' or 'boolean' type
    @ENV(`LOG_PATH`)
    logPath = `./logs/`;

    @ENV(`LOG_LEVEL`)
    logLevel = this.debug ? LogLevel.debug : LogLevel.info;


    @ENV(`YEAR_FILTER`)
    yearFilter = null;

    @ENV(`PAGE_FILTER`)
    pageFilter = null;


    @ENV(`AMAZON_TLD`)
    amazonTLD = `com`;

    @ENV(`AMAZON_USERNAME`)
    amazonUsername = null;

    @ENV(`AMAZON_PASSWORD`)
    amazonPassword = null;
}

export const config = loadConfig(Config);