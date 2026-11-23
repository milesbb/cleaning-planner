import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppMarkIcon } from '@/components/icons/interface-icons';
import { SOFTENED_PALETTE } from '@/lib/design-tokens';
import type { IconPurpose } from './app-icons';

// The share of the icon the mark takes up. A maskable icon may be cropped to
// a circle 80% of its width, so its mark stays well inside that.
const MARK_SHARE: Record<IconPurpose, number> = { any: 0.62, maskable: 0.5, apple: 0.62 };
const CORNER_SHARE = 0.22;
const MARK_STROKE_WIDTH = 2.2;
const SPLASH_ICON_SHARE = 0.28;

// The design system's own house-and-tick mark, so the icon never drifts from it.
function markSvg(left: number, top: number, size: number): string {
  const mark = renderToStaticMarkup(
    createElement(AppMarkIcon, { size, strokeWidth: MARK_STROKE_WIDTH }),
  );
  return mark
    .replace('<svg ', `<svg x="${String(left)}" y="${String(top)}" `)
    .replaceAll('currentColor', SOFTENED_PALETTE.paper);
}

function tileSvg(left: number, top: number, size: number, purpose: IconPurpose): string {
  const corners = purpose === 'any' ? ` rx="${String(Math.round(size * CORNER_SHARE))}"` : '';
  const markSize = size * MARK_SHARE[purpose];
  const markOffset = (size - markSize) / 2;
  return (
    `<rect x="${String(left)}" y="${String(top)}" width="${String(size)}" height="${String(size)}"${corners} fill="${SOFTENED_PALETTE.ink}"/>` +
    markSvg(left + markOffset, top + markOffset, markSize)
  );
}

function svgDocument(width: number, height: number, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}" viewBox="0 0 ${String(width)} ${String(height)}">${content}</svg>`;
}

export function appIconSvg(purpose: IconPurpose, size: number): string {
  return svgDocument(size, size, tileSvg(0, 0, size, purpose));
}

// What iOS shows while the installed app starts: the icon on the app's paper.
export function splashSvg(width: number, height: number): string {
  const iconSize = Math.round(Math.min(width, height) * SPLASH_ICON_SHARE);
  const left = Math.round((width - iconSize) / 2);
  const top = Math.round((height - iconSize) / 2);
  const background = `<rect width="${String(width)}" height="${String(height)}" fill="${SOFTENED_PALETTE.paper}"/>`;
  return svgDocument(width, height, background + tileSvg(left, top, iconSize, 'any'));
}
