const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const winVenv = path.join(root, ".venv-voice-win", "Scripts", "python.exe");
const linVenv = path.join(root, ".venv-voice", "bin", "python");

let python = "python";
if (process.platform === "win32" && fs.existsSync(winVenv)) {
  python = winVenv;
} else if (fs.existsSync(linVenv)) {
  python = linVenv;
}

const args = process.argv.slice(2);
const result = spawnSync(python, args, { stdio: "inherit", cwd: root });
if (result.error) console.error("Python could not start:", result.error.message);
process.exit(result.status ?? 1);
