import { Invoice } from "./invoice.interface";

export interface Order {
    date: string;
    datePlain: string;
    number: string;
    invoices: Array<Invoice>;

}

