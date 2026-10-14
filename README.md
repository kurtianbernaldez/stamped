# Stamped

A browser-based tool for creating tiled or single text and image watermarks. Preview the result, then export a PNG at your chosen canvas size.

## Use it

1. Choose **Text** or **Image** for the watermark. Image files must be 20 MB or smaller.
2. Choose **Tiled** or **Single**. In tiled mode, set the spacing and **Tile origin X/Y** to move the whole pattern, including the first tile. You can also drag the preview to move the watermark.
3. Set size, opacity, rotation, and any mirror or stagger options.
4. Optionally upload a background image. **Crop** is available for both the watermark image and background image. Cropping is non-destructive; reopen the crop editor to change it or choose Full image to reset it.
5. Select **Transparent PNG background** to export only the watermark pixels on a transparent canvas. The preview keeps a dark outer area and outlines the canvas; its checkerboard appears only inside the canvas. The uploaded background stays available when you turn transparency off.
6. Click **Export PNG**.

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
