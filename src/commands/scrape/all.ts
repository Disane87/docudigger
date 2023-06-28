

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
        this.runAll();

        if(!this.flags.recurring){
            return;
        }

        cron.schedule(this.flags.recurringCron, () =>{
            
            this.runAll();
        });
    }

    private runAll(){
        this.logger.info(`runAll`);
    }
}
