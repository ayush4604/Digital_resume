const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Configuration
const ALGORITHM = 'aes-256-gcm';
const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const DIGEST = 'sha256';

function encryptFile(inputPath, pin) {
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found at ${inputPath}`);
    process.exit(1);
  }

  const fileData = fs.readFileSync(inputPath);
  
  // 1. Generate random salt and IV
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  // 2. Derive key from PIN using PBKDF2
  const key = crypto.pbkdf2Sync(pin, salt, ITERATIONS, KEY_LENGTH, DIGEST);

  // 3. Encrypt data
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encryptedData = Buffer.concat([cipher.update(fileData), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // 4. Construct final payload
  // Format: [Salt (16 bytes)] + [IV (12 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext]
  const finalPayload = Buffer.concat([salt, iv, authTag, encryptedData]);

  // 5. Save to output path
  const filename = path.basename(inputPath);
  const outFilename = filename + '.enc';
  // Default to saving in the public/vault directory
  const outDir = path.join(__dirname, '..', 'public', 'vault');
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, outFilename);
  fs.writeFileSync(outPath, finalPayload);

  console.log(`\n✅ Success!`);
  console.log(`Original file: ${inputPath}`);
  console.log(`Encrypted file saved to: ${outPath}`);
  console.log(`\nThe file is now secured with AES-256 encryption.`);
  console.log(`Only someone with the PIN '${pin}' can decrypt it.\n`);
}

// CLI arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log(`Usage: node encrypt.js <path-to-file> <pin>`);
  console.log(`Example: node encrypt.js ../public/resume.pdf 1234`);
  process.exit(1);
}

const inputPath = args[0];
const pin = args[1];

encryptFile(inputPath, pin);
