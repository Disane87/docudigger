import { DateTime } from "luxon";

export interface Order {
    date: DateTime;
    datePlain: string;
    number: string;
    invoiceUrls: Array<string>
}
