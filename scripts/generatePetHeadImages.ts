import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

type Baseline = Record<string, { default?: unknown; skins?: Record<string, unknown> }>;
type Overlay = {
  defaults: Record<string, { textureHash?: unknown }>;
  skins: Record<string, { textureHash?: unknown }>;
};

const HASH_PATTERN = /^[a-f0-9]{32,64}$/i;

async function layeredFace(
  texture: Buffer,
  baseLeft: number,
  baseTop: number,
  overlayLeft: number,
  overlayTop: number
): Promise<string> {
  const base = await sharp(texture)
    .extract({ left: baseLeft, top: baseTop, width: 8, height: 8 })
    .png()
    .toBuffer();
  const overlay = await sharp(texture)
    .extract({ left: overlayLeft, top: overlayTop, width: 8, height: 8 })
    .png()
    .toBuffer();
  return (
    await sharp(base).composite([{ input: overlay, blend: 'over' }]).png().toBuffer()
  ).toString('base64');
}

async function renderIsometricHead(texture: Buffer): Promise<Buffer> {
  const [top, side, front] = await Promise.all([
    layeredFace(texture, 8, 0, 40, 0),
    layeredFace(texture, 0, 8, 32, 8),
    layeredFace(texture, 8, 8, 40, 8),
  ]);
  const face = (data: string, transform: string) =>
    `<image width="8" height="8" href="data:image/png;base64,${data}" transform="${transform}" image-rendering="pixelated"/>`;
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      ${face(top, 'matrix(6.5 3.25 -6.5 3.25 64 4)')}
      ${face(side, 'matrix(6.5 -3.25 0 8 64 56)')}
      ${face(front, 'matrix(6.5 3.25 0 8 12 30)')}
    </svg>
  `);
  return sharp(svg).png().toBuffer();
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(await readFile(resolve(root, 'data/petTextures.json'), 'utf8')) as Baseline;
  const overlay = JSON.parse(await readFile(resolve(root, 'data/petTextures.generated.json'), 'utf8')) as Overlay;
  const hashes = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === 'string' && HASH_PATTERN.test(value)) hashes.add(value.toLowerCase());
  };
  for (const entry of Object.values(baseline)) {
    add(entry.default);
    for (const hash of Object.values(entry.skins ?? {})) add(hash);
  }
  for (const entry of Object.values(overlay.defaults)) add(entry.textureHash);
  for (const entry of Object.values(overlay.skins)) add(entry.textureHash);

  const outputDirectory = resolve(root, 'public/pet-heads');
  await mkdir(outputDirectory, { recursive: true });
  let generated = 0;
  const unresolved: string[] = [];
  for (const hash of hashes) {
    try {
      const response = await fetch(`https://textures.minecraft.net/texture/${hash}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const texture = Buffer.from(await response.arrayBuffer());
      const image = await renderIsometricHead(texture);
      await writeFile(resolve(outputDirectory, `${hash}.png`), image);
      generated += 1;
    } catch (error) {
      unresolved.push(`${hash}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await writeFile(
    resolve(root, 'data/petHeadImages.unresolved.txt'),
    `${unresolved.join('\n')}${unresolved.length ? '\n' : ''}`,
    'utf8'
  );
  console.log(`Generated ${generated}/${hashes.size} local pet head images; unresolved: ${unresolved.length}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
