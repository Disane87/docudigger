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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    // Log error if needed, but ignore for now
    // console.error(err);
  }

  return false;
};
