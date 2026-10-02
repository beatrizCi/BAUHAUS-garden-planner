import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function uploadDir(): string {
  const dir = resolve(process.env.UPLOAD_DIR ?? 'uploads');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Turn a public "/uploads/abc.jpg" URL back into a file path, refusing anything outside the upload dir. */
export function uploadPathFromUrl(url: string): string {
  const name = url.replace(/^.*\/uploads\//, '').split('?')[0];
  if (!/^[\w.-]+$/.test(name)) throw new Error('Invalid upload reference');
  return resolve(uploadDir(), name);
}
