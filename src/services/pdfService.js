const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

function createReportPdf(res, title, rows, columns) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
  doc.on('error', (error) => {
    logger.error('PDF report generation failed', error);
    res.destroy(error);
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidth = pageWidth / columns.length;
  const padding = 6;
  let y = doc.page.margins.top;

  function drawHeader() {
    doc.font('Helvetica-Bold').fontSize(10);
    columns.forEach((column, index) => {
      doc.text(column.label, doc.page.margins.left + index * columnWidth, y, {
        width: columnWidth - padding,
        lineBreak: false
      });
    });
    y += 20;
    doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
    y += padding;
    doc.font('Helvetica').fontSize(9);
  }

  doc.font('Helvetica-Bold').fontSize(16).text(title);
  y = doc.y + 16;
  drawHeader();

  rows.forEach((row) => {
    const values = columns.map((column) => {
      const value = typeof column.value === 'function' ? column.value(row) : row[column.value];
      return value == null
        ? ''
        : String(value).replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7e\xa0-\xff]/g, '?');
    });
    const heights = values.map((value) => doc.heightOfString(value, { width: columnWidth - padding * 2 }));
    const rowHeight = Math.max(...heights) + padding * 2;
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
    }
    values.forEach((value, index) => {
      doc.text(value, doc.page.margins.left + index * columnWidth + padding, y + padding, {
        width: columnWidth - padding * 2
      });
    });
    y += rowHeight;
  });

  doc.end();
}

module.exports = { createReportPdf };
