import { Scrape } from "./scrape.interface";

export interface WebsiteRun {
    lastRun: Date,
    scrapes: Array<Scrape>;
}