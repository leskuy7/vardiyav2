import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 16;
const SALT_LEN = 16;
const TAG_LEN = 16;

function getKey(secret: string): Buffer {
  return scryptSync(secret, 'vardiya-credential-vault', KEY_LEN);
}

export function encryptPassword(plain: string, secret: string): string {
  const key = getKey(secret);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const salt = randomBytes(SALT_LEN);
  return Buffer.concat([salt, iv, tag, enc]).toString('base64');
}

export function decryptPassword(encrypted: string, secret: string): string {
  const raw = Buffer.from(encrypted, 'base64');
  const salt = raw.subarray(0, SALT_LEN);
  const iv = raw.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = raw.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
  const data = raw.subarray(SALT_LEN + IV_LEN + TAG_LEN);
  const key = getKey(secret);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString('utf8') + decipher.final('utf8');
}
