import { Logger } from "winston";
import { InvoiceStatus } from "../../../../enums/invoice-status.enum";
import { Invoice } from "../../../../interfaces/invoice.interface";
import { Scrape } from "../../../../interfaces/scrape.interface";
import fs from "fs";
import path from "path";
import { ScrapeCommand } from "../../../../classes/scrape-command.class";
import { Command } from "@oclif/core/lib/command";

export class FileHandler<T extends typeof Command> {
  constructor(private logger: Logger, private flags: ScrapeCommand<T>[`flags`], private pluginName: string) {} // Logger, flags und pluginName als Klassenvariablen

  writeFile(destPluginFileFolder: string, pathNormalized: string, invoice: Invoice, fileBuffer: Buffer, order: Scrape) {
    if (!fs.existsSync(destPluginFileFolder)) {
      fs.mkdirSync(destPluginFileFolder, { recursive: true });
    }

    if (!fs.existsSync(pathNormalized)) {
      this.logger.debug(`Fullpath not exists: ${pathNormalized}`);
      try {
        this.logger.info(`Writing file: ${pathNormalized}`);
        invoice.status = InvoiceStatus.downloaded;
        fs.writeFileSync(pathNormalized, fileBuffer);
        invoice.status = InvoiceStatus.saved;
      } catch (err) {
        this.logger.error(err);
      }
    } else {
      this.logger.warn(`Invoice "${path.basename(pathNormalized)}" of order "${order.number}" already exists. Skipping file creation.`);
      invoice.status = InvoiceStatus.skipped;
    }
  }

  getPaths(invoiceUrl: string, order: Scrape, invoiceIndex: number) {
    const destPluginFileFolder = path.resolve(
      path.join(this.flags.fileDestinationFolder, this.flags.subFolderForPages ? this.pluginName : ``, `/`),
      `./`
    );
    const fileExtention = path.extname(invoiceUrl).split(`?`)[0] ?? this.flags.fileFallbackExentension;
    const fileName = `${order.date}_AMZ_${order.number}_${invoiceIndex + 1}`;
    const fullFilePath = path.resolve(destPluginFileFolder, `${fileName}${fileExtention}`);
    const pathNormalized = path.normalize(fullFilePath);
    return { destPluginFileFolder, pathNormalized };
  }

  getFileBuffer(fileReaderString: string, invoice: Invoice, order: Scrape, invoiceUrl: string): Buffer | null {
    if (!fileReaderString) {
      this.logger.error(`FileReaderString is empty returned from page for order "${order.number}" and url "${invoiceUrl}"`);
      return null;
    }
    const fileBuffer = Buffer.from(fileReaderString, `binary`);
    if (!fileBuffer) {
      this.logger.error(`Failed to create buffer from fileReader for order "${order.number}"`);
      return null;
    }
    invoice.status = InvoiceStatus.downloaded;
    this.logger.debug(`Created buffer from fileReader.`);
    return fileBuffer;
  }

  async getFileReaderString(pdfPage, invoiceUrl: string): Promise<string> {
    return await pdfPage.evaluate(async (url) => {
      const response = await window.fetch(url, { mode: `no-cors` });
      const data = await response.blob();
      const reader = new FileReader();

      return new Promise<string>((resolve, reject) => {
        reader.readAsBinaryString(data);
        reader.onloadend = () => {
          resolve(reader.result.toString());
        };
        reader.onerror = () => {
          reject(reader.error);
          return null;
        };
      });
    }, invoiceUrl);
  }
}
