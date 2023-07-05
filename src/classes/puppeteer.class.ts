import puppeteer, { Browser, Page } from "puppeteer";
import * as fs from 'fs';

export { Browser, Page };

export class Puppeteer {
    public browser: Browser;
    private debug: boolean;
    private arguments: string[];

    constructor(debug: boolean, pupeteerArgs: string[]){
        this.debug = debug;
        this.arguments = pupeteerArgs;
    }

    public async setup(): Promise<Browser> {
        this.browser = await puppeteer.launch({ headless: false, args: this.arguments, dumpio: false, devtools: this.debug, executablePath: this.getExecutablePath() });
        return this.browser;
    }

    private getExecutablePath(): string {
        return this.locateChrome();
    }

    private locateChrome(): string {

        let paths: string[];

        switch(process.platform) {
        case `darwin`:
            paths = [
                `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
                `/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`,
                `/Applications/Chromium.app/Contents/MacOS/Chromium`,
                `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
                `/usr/bin/google-chrome-stable`,
                `/usr/bin/google-chrome`,
                `/usr/bin/chromium`,
                `/usr/bin/chromium-browser`
            ];
            break;
            
        case `win32`:
            paths = [
                process.env[`LocalAppData`] + `/Google/Chrome/Application/chrome.exe`,
                process.env[`ProgramFiles`] + `/Google/Chrome/Application/chrome.exe`,
                process.env[`ProgramFiles(x86)`] + `/Google/Chrome/Application/chrome.exe`,
                process.env[`LocalAppData`] + `/Chromium/Application/chrome.exe`,
                process.env[`ProgramFiles`] + `/Chromium/Application/chrome.exe`,
                process.env[`ProgramFiles(x86)`] + `/Chromium/Application/chrome.exe`,
                process.env[`ProgramFiles(x86)`] + `/Microsoft/Edge/Application/msedge.exe`,
                process.env[`ProgramFiles`] + `/Microsoft/Edge/Application/msedge.exe`,
            ];
            break;
        default:
            paths = [
                `/usr/bin/google-chrome-stable`,
                `/usr/bin/google-chrome`,
                `/usr/bin/chromium`,
                `/usr/bin/chromium-browser`,
                `/snap/bin/chromium`,
            ];
        }
    
        for (const path of paths) {
            try {
              fs.accessSync(path);
              return path;
            } catch (err) {
              if (err.code !== `ENOENT`) {
                throw err;
              }
              continue;
            }
          }
        return null;
    }
}