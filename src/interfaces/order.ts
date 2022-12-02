import { Invoice } from "./invoice";

export interface Order {
    date: string;
    datePlain: string;
    number: string;
    invoices: Array<Invoice>;

}

