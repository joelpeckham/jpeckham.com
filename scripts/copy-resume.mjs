import { copyFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "resume", "main.pdf");
const destination = join(root, "public", "Joel_Peckham_Resume.pdf");

try {
  await access(source);
} catch {
  console.error(
    `[copy-resume] Could not find ${source}. Did you run 'git submodule update --init'?`,
  );
  process.exit(1);
}

await copyFile(source, destination);
console.log(`[copy-resume] Copied resume PDF to ${destination}`);
