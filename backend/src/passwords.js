import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(String(password), salt, 64);
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof password !== 'string') return false;
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
