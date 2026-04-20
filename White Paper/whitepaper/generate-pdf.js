/**
 * NDN IPFS Chain — White Paper PDF Generator
 * Renders the interactive HTML whitepaper and exports a print-ready PDF
 * suitable for direct LinkedIn document upload.
 *
 * Usage: node generate-pdf.js
 * Output: ../NDN-IPFS-Chain-Whitepaper.pdf
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUTPUT_PATH = path.resolve(__dirname, '..', 'NDN-IPFS-Chain-Whitepaper.pdf');
const SOURCE_URL = 'http://localhost:5199';

(async () => {
  console.log('\n  NDN IPFS Chain — White Paper PDF Generator');
  console.log('  ──────────────────────────────────────────');
  console.log(`  Source : ${SOURCE_URL}`);
  console.log(`  Output : ${OUTPUT_PATH}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();

  // Emulate a large desktop viewport so all columns render correctly
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });

  console.log('  [1/5] Loading page…');
  await page.goto(SOURCE_URL, { waitUntil: 'networkidle0', timeout: 60000 });

  // Wait for fonts and animations to settle
  console.log('  [2/5] Waiting for fonts & animations…');
  await new Promise(r => setTimeout(r, 3000));

  // Inject print-override CSS to:
  //   • Force dark background & all colors to render (color-adjust)
  //   • Hide nav, sidebar, PDF button, floating elements
  //   • Set clean page margins for A4 LinkedIn format
  //   • Trigger intersection-observer animations immediately (no lazy reveal needed in PDF)
  console.log('  [3/5] Applying print styles…');
  await page.addStyleTag({
    content: `
      /* ------ Print overrides for PDF export ------ */
      @page {
        size: A4;
        margin: 12mm 14mm 14mm 14mm;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      /* Make all animated elements visible immediately */
      .fade-in, [class*="animate"], [data-aos] {
        opacity: 1 !important;
        transform: none !important;
        visibility: visible !important;
      }

      /* Hide chrome UI elements */
      nav, #toc-sidebar, .save-pdf-btn, .back-to-top,
      .nav-cta, #toc-toggle, .reading-progress {
        display: none !important;
      }

      /* Remove sticky nav so content flows from top */
      body { padding-top: 0 !important; }

      /* Prevent orphaned headings */
      h1, h2, h3 { page-break-after: avoid; }

      /* Keep cards together */
      .stat-card, .plane-card, .feature-card, .roadmap-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      /* Tighten hero for PDF — remove large whitespace block */
      .hero {
        min-height: unset !important;
        padding: 60px 40px 50px !important;
      }

      /* Tables visible, no horizontal scroll */
      .table-wrapper { overflow: visible !important; }
      table { font-size: 11px !important; }
      td, th { padding: 6px 8px !important; white-space: normal !important; }

      /* Section spacing */
      section { page-break-before: auto; margin-bottom: 16px !important; }
      .section-header { margin-bottom: 24px !important; }
    `
  });

  // Reveal all .fade-in elements so they appear in the PDF
  await page.evaluate(() => {
    document.querySelectorAll('.fade-in').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    // Scroll page to bottom once to trigger all observers, then back to top
    window.scrollTo(0, document.body.scrollHeight);
    window.scrollTo(0, 0);
  });

  await new Promise(r => setTimeout(r, 1500));

  console.log('  [4/5] Generating PDF…');
  await page.pdf({
    path: OUTPUT_PATH,
    format: 'A4',
    printBackground: true,        // Critical: renders dark bg + gradients
    displayHeaderFooter: false,
    margin: {
      top: '12mm',
      right: '14mm',
      bottom: '14mm',
      left: '14mm',
    },
    preferCSSPageSize: false,
  });

  await browser.close();

  const stats = fs.statSync(OUTPUT_PATH);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`  [5/5] Done!\n`);
  console.log(`  ✅  PDF saved: ${path.basename(OUTPUT_PATH)}`);
  console.log(`  📄  Size    : ${sizeMB} MB`);
  console.log(`  📍  Path    : ${OUTPUT_PATH}\n`);
  console.log('  LinkedIn tip: Upload via "Add document" on your post or profile Featured section.\n');
})();
