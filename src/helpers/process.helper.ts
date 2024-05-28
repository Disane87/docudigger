import * as fs from "fs";

export const isRunningInDocker = () => {
    const dockerPath = `/proc/1/cgroup`;
    try {
        if (fs.existsSync(dockerPath)) {
            const content = fs.readFileSync(dockerPath, `utf8`);
            return content.includes(`docker`);
        }
        return false;
    } catch (err) {
        return false;
    }
};
