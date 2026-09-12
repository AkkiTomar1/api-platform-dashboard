import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");
const privatePath = process.env.JWT_PRIVATE_KEY_PATH
  ? resolve(process.env.JWT_PRIVATE_KEY_PATH)
  : resolve(apiDir, "jwt-private.pem");
const publicPath = process.env.JWT_PUBLIC_KEY_PATH
  ? resolve(process.env.JWT_PUBLIC_KEY_PATH)
  : resolve(apiDir, "jwt-public.pem");

if (existsSync(privatePath) || existsSync(publicPath)) {
  console.error("Refusing to overwrite existing key files.");
  console.error(`  ${privatePath}`);
  console.error(`  ${publicPath}`);
  console.error("Delete them first (or set JWT_PRIVATE_KEY_PATH/JWT_PUBLIC_KEY_PATH) and re-run.");
  process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

mkdirSync(dirname(privatePath), { recursive: true });
mkdirSync(dirname(publicPath), { recursive: true });
writeFileSync(privatePath, privateKey, { encoding: "utf8", mode: 0o600 });
writeFileSync(publicPath, publicKey, { encoding: "utf8", mode: 0o644 });

console.log("JWT RS256 key pair generated:");
console.log(`  private: ${privatePath}`);
console.log(`  public:  ${publicPath}`);
console.log(
  "Set JWT_PRIVATE_KEY_PATH/JWT_PUBLIC_KEY_PATH in apps/api/.env (or use inline JWT_PRIVATE_KEY/JWT_PUBLIC_KEY).",
);