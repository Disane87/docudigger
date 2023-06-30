import { resolve } from "path";
import * as packageJson from "../package.json";
import { readFileSync, writeFileSync } from "fs";
import * as envfile from 'envfile';
import { exec } from "child_process";

const determineDockerVersion = (packageVersion: string): string | null => {
    const useLatest = false;

    const version = packageVersion;
    if (!version) {
        console.error(`Package version not found in package.json.`);
        return null;
    }

    return version;

    // if (version.includes(`-dev`) || !useLatest) {
        
    // } else {
    //     return `latest`;
    // }
};

const getBranch = () => new Promise<string>((resolve, reject) => {
    return exec(`git rev-parse --abbrev-ref HEAD`, (err, stdout, _) => {
        if (err)
            reject(`getBranch Error: ${err}`);
        else if (typeof stdout === `string`)
            resolve(stdout.trim());
    });
});

const writeEnvToFile = (
    envVariables: { key: string; value: any }[],
): void => {
    // get `.env` from path of current directory
    const path = resolve(__dirname, `../.env`);
    console.log(`Writing .env:`, path);

    try {
        const data = readFileSync(path, `utf8`);
        const parsedFile = envfile.parse(data);
        envVariables.forEach((envVar: { key: string; value: any }) => {
            if (envVar.key && envVar.value) {
                parsedFile[envVar.key] = envVar.value;
            }
        });

        writeFileSync(path, envfile.stringify(parsedFile));
        console.log(`Updated .env: `, parsedFile);
    } catch (err) {
        if (err) {
            console.error(err);
            return;
        }
    }
};

(async function main() {
    try {
        const version = await determineDockerVersion(packageJson.version);
        let branch = await getBranch();

        if(branch == `main`){
            branch = `latest`;
        }

        if (!version) {
            process.exit();
        }

        writeEnvToFile([
            {
                key: `RELEASE_DOCKER_VERSION`,
                value: version
             },
             {
                key: `GIT_BRANCH`,
                value: branch
             },
        ]);
        process.exit();
    } catch (e) {
        process.exit(1);
    }
})();
