import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0) {
  process.exit(0);
}

function snapshot(files) {
  const map = new Map();
  for (const file of files) {
    try {
      map.set(file, readFileSync(file, "utf8"));
    } catch {
      map.set(file, null);
    }
  }
  return map;
}

function restore(files, snap, changedMarkers) {
  for (const file of files) {
    if (changedMarkers.has(file)) {
      continue;
    }
    const original = snap.get(file);
    if (original === undefined) {
      continue;
    }
    let current = null;
    try {
      current = readFileSync(file, "utf8");
    } catch {
      current = null;
    }
    if (original !== current) {
      if (original === null) {
        try {
          writeFileSync(file, original, "utf8");
        } catch {}
      } else {
        writeFileSync(file, original, "utf8");
      }
    }
  }
}

function run() {
  const staged = args.filter(Boolean);

  const eslintBackup = snapshot(staged);
  execSync(`eslint --fix ${staged.map((f) => `"${f}"`).join(" ")}`, {
    stdio: "inherit",
    shell: true,
  });

  const eslintChanged = new Set();
  for (const file of staged) {
    try {
      if (readFileSync(file, "utf8") !== eslintBackup.get(file)) {
        eslintChanged.add(file);
      }
    } catch {}
  }

  restore(staged, eslintBackup, eslintChanged);

  const cli = ["prettier", "--write", ...staged.map((f) => `"${f}"`)].join(" ");
  execSync(cli, { stdio: "inherit", shell: true });
}

run();
