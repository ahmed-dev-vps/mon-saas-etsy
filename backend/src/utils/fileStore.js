const fs = require("fs/promises");
const path = require("path");
const env = require("../config/env");

const backendRoot = path.resolve(__dirname, "..", "..");
const basePath = path.resolve(backendRoot, env.storage.dataPath);

async function readJson(fileName, fallback) {
  const filePath = path.join(basePath, fileName);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJson(fileName, value) {
  const filePath = path.join(basePath, fileName);
  await fs.mkdir(basePath, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

module.exports = {
  readJson,
  writeJson,
};
