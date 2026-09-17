import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const WATCH_TARGETS = [
  path.join(ROOT, "src", "index.html"),
  path.join(ROOT, "recipes"),
  path.join(ROOT, "ingredients.yaml"),
];

let building = false;
let rerunPending = false;
let debounceTimer = null;

function runBuild() {
  if (building) {
    rerunPending = true;
    return;
  }
  building = true;
  const child = spawn(process.execPath, [path.join(__dirname, "build.mjs")], { stdio: "inherit" });
  child.on("exit", () => {
    building = false;
    if (rerunPending) {
      rerunPending = false;
      runBuild();
    }
  });
}

function scheduleBuild() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runBuild, 150);
}

console.log("Watching src/index.html, recipes/, ingredients.yaml for changes...\n");
runBuild();

for (const target of WATCH_TARGETS) {
  fs.watch(target, { recursive: fs.statSync(target).isDirectory() }, () => scheduleBuild());
}
