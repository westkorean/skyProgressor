import fs from 'fs/promises';
import path from 'path';

export async function readData<T = any>(fileName: string): Promise<T | null> {
  try {
    const p = path.join(process.cwd(), 'data', fileName);
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    return null;
  }
}

export async function writeData<T = any>(fileName: string, data: T) {
  const p = path.join(process.cwd(), 'data', fileName);
  const raw = JSON.stringify(data, null, 2);
  await fs.writeFile(p, raw, 'utf8');
}

export type PetSkinEntry = {
  petType: string;
  suggestedSkin?: string; // username or uuid
  notes?: string;
};

export async function ensureDataFile(fileName: string, initial: any) {
  const existing = await readData(fileName);
  if (!existing) {
    await writeData(fileName, initial);
  }
}
