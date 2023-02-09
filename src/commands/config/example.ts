

import { Flag } from '@oclif/core/lib/interfaces';
import Commands from '@oclif/plugin-commands/lib/commands/commands';
import { BaseCommand } from "../../base.class";

export default class Example extends BaseCommand<typeof Example> {
    static description = `Creates an example .env file with all possible flags`;
    static summary = '';

    static examples = [
        `<%= config.bin %> <%= command.id %>`,
    ];

    static flags = {

    };

    public async run(): Promise<void> {
        const commands = await Commands.run(['--json']) as Array<{ pluginName: string, flags: Record<string, Flag<unknown>> }>;
        const ownPluginFlags = [...new Set(commands.filter(item => item.pluginName.indexOf("@docudigger") > -1 && Object.keys(item.flags).length > 0).flatMap(item => Object.values(item.flags).map(flag => `${flag.name.toUpperCase()}=${flag.default}`)))];


    }

}
