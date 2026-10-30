// Screenshot do diagrama HTML -> PNG @2x (300dpi equivalente) para embutir no PDF
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const html = path.resolve(process.argv[2]);
  const out = path.resolve(process.argv[3]);
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1000, height: 620 },
    deviceScaleFactor: 2,
  });
  await page.goto('file://' + html);
  await page.waitForTimeout(600);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1000, height: 620 } });
  await browser.close();
  console.log('PNG salvo:', out);
})();
