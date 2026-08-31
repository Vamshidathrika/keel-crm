import fs from "fs";
import crypto from "crypto";
import readline from "readline";

const algorithm = "aes-256-gcm";
const envPath = ".env.local";
const encPath = ".env.local.enc";

async function promptPassword() {
  if (process.argv[2]) return process.argv[2];
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question("Enter encryption password: ", (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  if (!fs.existsSync(envPath)) {
    console.error(`Error: ${envPath} not found.`);
    process.exit(1);
  }

  const password = await promptPassword();
  if (!password) {
    console.error("Password cannot be empty.");
    process.exit(1);
  }

  const plaintext = fs.readFileSync(envPath, "utf8");
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: salt (16 bytes) + iv (12 bytes) + authTag (16 bytes) + encrypted data
  const outputBuffer = Buffer.concat([salt, iv, authTag, encrypted]);
  fs.writeFileSync(encPath, outputBuffer);

  console.log(`\n✅ Successfully encrypted ${envPath} -> ${encPath}`);
  console.log(`To restore: node scripts/decrypt-env.mjs <password>`);
}

main().catch(console.error);
