import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);

function resolveDocker() {
  if (process.env.DOCKER) {
    return process.env.DOCKER;
  }
  if (process.platform === "win32") {
    const candidates = [];
    if (process.env.LOCALAPPDATA) {
      candidates.push(
        join(process.env.LOCALAPPDATA, "Programs", "DockerDesktop", "resources", "bin", "docker.exe"),
      );
    }
    if (process.env.ProgramFiles) {
      candidates.push(
        join(process.env.ProgramFiles, "Docker", "Docker", "resources", "bin", "docker.exe"),
      );
    }
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return "docker";
}

const docker = resolveDocker();
const env = { ...process.env };
if (process.platform === "win32" && docker.endsWith(".exe")) {
  const dockerDir = dirname(docker);
  env.PATH = `${dockerDir}${env.PATH ? `;${env.PATH}` : ""}`;
}

const result = spawnSync(docker, ["compose", "-f", "infra/kong/compose.yaml", ...args], {
  stdio: "inherit",
  env,
});

process.exit(result.status ?? (result.error ? 1 : 0));