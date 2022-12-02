export interface ProcessedOrder {
    number: string;
    invoiceCount: number;

    savedInvoices: Array<string>
}