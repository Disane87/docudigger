import * as fs from "fs";

export const isRunningInDocker = () => {
    try {
        // Check if /.dockerenv file exists
        if (fs.existsSync(`/.dockerenv`)) {
          return true;
        }
    
        // Check if /proc/self/cgroup contains 'docker'
        const cgroup = fs.readFileSync(`/proc/self/cgroup`, `utf8`);
        if (cgroup.includes(`docker`)) {
          return true;
        }
      } catch (err) {
        // Log error if needed, but ignore for now
      }
    
      return false;
};
