

import { BaseCommand } from "../../classes/base.class";
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
        

        if(!this.flags.recurring){
            return;
        }

        await this.runAll();

        cron.schedule(this.flags.recurringCron, async () =>{
            
            await this.runAll();
            
        });

    }

    private runAll(): Promise<unknown>{
        this.logger.info(`runAll`);
        return Promise.all([this.config.runCommand(`scrape:amazon`)]);
    }
}
