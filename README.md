# Stamped

A browser-based tool for creating tiled or single text and image watermarks. Preview the result, then export a PNG at your chosen canvas size.

## Use it

1. In the left column, choose Text or Image, enter text or upload and crop a watermark image, and set the canvas size and background. Image files must be 20 MB or smaller.
2. In the right column, choose Repeat or Single. In Repeat mode, adjust spacing and Origin X/Y to move the whole pattern, including the first tile. You can also drag the preview or use its arrow keys to move the watermark.
3. Adjust opacity, rotation, and mirroring in the right column.
4. Select **Transparent PNG** to export only the watermark pixels on a transparent canvas. The preview keeps a dark outer area and outlines the canvas; its checkerboard appears only inside the canvas. The uploaded background stays available when you turn transparency off.
5. Click **Export PNG**.

The desktop editor keeps both control columns, the preview, and Export visible in a single screen. On narrow screens, the controls are grouped into **Watermark & canvas** and **Placement & style**. **More settings** opens the less common options without scrolling.

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
