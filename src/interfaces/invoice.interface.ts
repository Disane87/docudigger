import { InvoiceStatus, InvoiceStatusMessages } from "../enums/invoice-status.enum";

export interface Invoice {
    url: string;
    status: InvoiceStatus
    statusMessage: keyof InvoiceStatusMessages

    path?: string
}