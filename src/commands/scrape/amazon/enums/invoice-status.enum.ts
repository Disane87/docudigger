export enum InvoiceStatus {
    determined,
    opened,

    downloaded,

    saved,

    skipped

}

export enum InvoiceStatusMessages {
    determined = `Invoice has been determined and is waiting for processing`,
    opened = `Invoice has been opened in new page and waits to be downloaded`,

    downloaded = `Invoice has been downloaded and waits to be written`,

    saved = `Invoice has been saved to storage`,

    skipped = `Skipped because fil was already been handled`
}