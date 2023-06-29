

import { BaseCommand } from "../../base.class";
import cron from 'node-cron';


export default class All extends BaseCommand<typeof All> {
    public pluginName = `all`;
    static description = `Scrapes all websites periodically`;
    static summary = ``;

    static examples = [
        `<%= config.bin %> <%= command.id %>`,
    ];

    static flags = {
      
    };

    public async run(): Promise<void> {
        await this.runAll();

        if(!this.flags.recurring){
            return;
        }

        cron.schedule(this.flags.recurringCron, async () =>{
            
            await this.runAll();
            
        });

    }

    private runAll(): Promise<unknown>{
        this.logger.info(`runAll`);
        return Promise.all([this.config.runCommand(`scrape:amazon`)]);
    }
}
