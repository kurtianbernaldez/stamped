# Stamped

A browser-based tool for creating tiled or single text and image watermarks. Preview the result, then export a PNG at your chosen canvas size.

## Use it

1. Use **Watermark** to choose Text or Image, enter text, select a font or color, or upload and crop a watermark image. Image files must be 20 MB or smaller.
2. Use **Layout** to choose Repeat or Single. In Repeat mode, adjust spacing and Origin X/Y to move the whole pattern, including the first tile. You can also drag the preview or use its arrow keys to move the watermark.
3. Use **Style** to adjust opacity, rotation, and mirroring.
4. Use **Canvas** → **Size & export** to set dimensions and transparent PNG output. Use **Canvas** → **Background** to choose a background color or upload, crop, and fit a background image.
5. Select **Transparent PNG** to export only the watermark pixels on a transparent canvas. The preview keeps a dark outer area and outlines the canvas; its checkerboard appears only inside the canvas. The uploaded background stays available when you turn transparency off.
6. Click **Export PNG**.

The editor keeps the preview and export action visible in a single screen. Its controls are divided into short views instead of scrollable panels.

The background color is drawn under an uploaded background image, so it shows through when the image uses Contain or None fit. The preview uses the same drawing rules as export. Large previews are rendered at a lower resolution for responsiveness; exports use the selected canvas dimensions. Repeating tiles are cached while you adjust placement or the background. Exceptionally dense patterns show a message instead of freezing the page.

Canvas width and height can each be up to 8,000 px. PNG export is limited to 32 million pixels to avoid excessive browser memory use.

## Develop

```sh
npm install
npm run dev
npm run build
npm run lint
npm test
```

Built with React, TypeScript, and Vite. Image processing happens in your browser.
