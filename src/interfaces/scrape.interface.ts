import { Invoice } from "./invoice.interface";

export interface Scrape {
    date: string;
    datePlain: string;
    number: string;
    invoices: Array<Invoice>;

}