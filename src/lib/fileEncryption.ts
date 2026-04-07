/**
 * Zero-Knowledge File Encryption Engine
 * ======================================
 * Uses Web Crypto API to encrypt files client-side before transmission.
 * 
 * ENCRYPTION:
 *   1. Generate random 16-byte salt and 12-byte IV
 *   2. Derive AES-256-GCM key via PBKDF2 using (PIN + salt), 100k iterations, SHA-256
 *   3. Encrypt file ArrayBuffer → ciphertext
 * 
 * ADMIN-SIDE DECRYPTION PROCEDURE:
 * ─────────────────────────────────
 * To decrypt an uploaded .bin file, the admin needs:
 *   - The 4-digit PIN (communicated out-of-band by the uploader)
 *   - The `encryption_salt` (hex string from admin_submissions table)
 *   - The `encryption_iv` (hex string from admin_submissions table)
 *   - The encrypted .bin file from the secure_ingress bucket
 * 
 * Steps:
 *   1. Convert salt hex → Uint8Array
 *   2. Convert iv hex → Uint8Array
 *   3. Import PIN as raw key material via crypto.subtle.importKey("raw", ...)
 *   4. Derive AES-GCM key via crypto.subtle.deriveKey with PBKDF2:
 *      - salt: the salt from step 1
 *      - iterations: 100000
 *      - hash: SHA-256
 *      - derivedKeyType: { name: "AES-GCM", length: 256 }
 *   5. Decrypt with crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext)
 *   6. The result is the original file ArrayBuffer
 * 
 * Example Node.js decryption (for admin tooling):
 * ```js
 * const crypto = require('crypto');
 * const salt = Buffer.from(saltHex, 'hex');
 * const iv = Buffer.from(ivHex, 'hex');
 * const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256');
 * const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
 * const authTag = ciphertext.slice(-16);
 * const encrypted = ciphertext.slice(0, -16);
 * decipher.setAuthTag(authTag);
 * const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
 * ```
 * Note: Web Crypto appends the 16-byte GCM auth tag to the ciphertext.
 */

const PBKDF2_ITERATIONS = 100_000;

/** Convert ArrayBuffer to hex string */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Derive an AES-256-GCM key from a PIN and salt using PBKDF2 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin).buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

export interface EncryptionResult {
  encryptedBlob: Blob;
  saltHex: string;
  ivHex: string;
}

/**
 * Encrypt a file using AES-256-GCM with a PIN-derived key.
 * @param file - The file to encrypt
 * @param pin - 4-digit guest PIN used for key derivation
 * @returns Encrypted blob plus hex-encoded salt and IV for storage
 */
export async function encryptFile(
  file: File,
  pin: string
): Promise<EncryptionResult> {
  // Generate random salt (16 bytes) and IV (12 bytes for GCM)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive AES-256-GCM key from PIN + salt
  const key = await deriveKey(pin, salt);

  // Read file into ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // Encrypt (GCM appends 16-byte auth tag automatically)
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileBuffer
  );

  return {
    encryptedBlob: new Blob([ciphertext], { type: "application/octet-stream" }),
    saltHex: bufToHex(salt),
    ivHex: bufToHex(iv),
  };
}
