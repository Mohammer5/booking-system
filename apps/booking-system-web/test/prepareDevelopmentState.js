import fs from "node:fs/promises";

const generatedStateDirectory = new URL("../.wrangler/state", import.meta.url);

await fs.rm(generatedStateDirectory, { recursive: true, force: true });
