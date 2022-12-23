import { Page } from "puppeteer";

export interface DownloadConstructor {
    new(page: Page, urls: Array<string>): Downloader

}
export interface Downloader {
    download(url: string): void
    save(buffer: Buffer): Promise<boolean>
}