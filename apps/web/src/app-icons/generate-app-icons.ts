import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { appIconSvg, splashSvg } from './app-icon-svg';
import { APPLE_TOUCH_ICON, FAVICON_SIZE, MANIFEST_ICONS, SPLASH_SCREENS } from './app-icons';

// Writes every app icon and splash screen into public/icons. Run it after
// changing the app mark or the palette:
//   npm run generate:icons --workspace=apps/web

const OUTPUT_FOLDER = resolve(import.meta.dirname, '../../public/icons');
const FAVICON = resolve(import.meta.dirname, '../app/icon.svg');

async function writePng(file: string, svg: string): Promise<void> {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(resolve(OUTPUT_FOLDER, file));
  process.stdout.write(`${file}\n`);
}

await mkdir(OUTPUT_FOLDER, { recursive: true });
for (const icon of [...MANIFEST_ICONS, APPLE_TOUCH_ICON]) {
  await writePng(icon.file, appIconSvg(icon.purpose, icon.sizePixels));
}
await writeFile(
  FAVICON,
  `${appIconSvg('any', FAVICON_SIZE)}
`,
);
for (const screen of SPLASH_SCREENS) {
  await writePng(screen.file, splashSvg(screen.widthPixels, screen.heightPixels));
}
