import fs from "fs";
import crypto from "crypto";
import readline from "readline";

const algorithm = "aes-256-gcm";
const encPath = ".env.local.enc";
const envPath = ".env.local";

async function promptPassword() {
  if (process.argv[2]) return process.argv[2];
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question("Enter decryption password: ", (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  if (!fs.existsSync(encPath)) {
    console.error(`Error: ${encPath} not found.`);
    process.exit(1);
  }

  const password = await promptPassword();
  if (!password) {
    console.error("Password cannot be empty.");
    process.exit(1);
  }

  const buffer = fs.readFileSync(encPath);
  if (buffer.length < 44) {
    console.error("Invalid encrypted file format.");
    process.exit(1);
  }

  const salt = buffer.subarray(0, 16);
  const iv = buffer.subarray(16, 28);
  const authTag = buffer.subarray(28, 44);
  const encryptedData = buffer.subarray(44);

  try {
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString("utf8");
    fs.writeFileSync(envPath, decrypted);

    console.log(`\n✅ Successfully decrypted ${encPath} -> ${envPath}`);
  } catch (err) {
    console.error("\n❌ Decryption failed. Incorrect password or corrupted file.");
    process.exit(1);
  }
}

main().catch(console.error);
