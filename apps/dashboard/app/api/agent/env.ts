import path from "node:path";

import { config as loadDotenv } from "dotenv";

let loaded = false;

export const loadRootEnv = () => {
  if (loaded) {
    return;
  }

  loadDotenv({
    path: path.resolve(process.cwd(), "../../.env"),
    override: false,
    quiet: true
  });
  loaded = true;
};
