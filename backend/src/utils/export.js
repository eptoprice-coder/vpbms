const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Streams an Excel workbook built from rows/columns directly to the HTTP response.
const exportToExcel = async (res, { filename, columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
};

// Streams a tabular PDF report directly to the HTTP response.
// Each row's height is measured before drawing so wrapped text never
// overlaps the next row, and the table header repeats on every page.
const exportToPDF = (res, { title, columns, rows }) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`);
  doc.pipe(res);

  const M = 30; // margin
  const tableW = doc.page.width - 2 * M;
  const colWidth = tableW / columns.length;
  const cellPad = 4;
  const bottom = () => doc.page.height - 40;

  // The built-in Helvetica font cannot render Tamil/emoji — strip to printable Latin.
  const clean = (v) => {
    const s = String(v ?? '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
    return s || '-';
  };

  let y;

  const drawTitle = () => {
    doc.font('Helvetica-Bold').fontSize(15).fillColor('#111827')
      .text(clean(title), M, 26, { width: tableW, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor('#6B7280')
      .text(`Generated: ${new Date().toLocaleString('en-IN')}`, M, 46, { width: tableW, align: 'center' });
    y = 62;
  };

  const drawHeader = () => {
    doc.rect(M, y, tableW, 18).fill('#166534');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
    columns.forEach((c, i) => {
      doc.text(clean(c.header), M + i * colWidth + cellPad, y + 5, {
        width: colWidth - 2 * cellPad, lineBreak: false, ellipsis: true,
      });
    });
    y += 18;
  };

  drawTitle();
  drawHeader();

  doc.font('Helvetica').fontSize(9);
  rows.forEach((row, ri) => {
    const texts = columns.map((c) => clean(row[c.key]));
    // Measure the tallest cell to get this row's true height
    const rowH = Math.max(
      12,
      ...texts.map((t) => doc.heightOfString(t, { width: colWidth - 2 * cellPad }))
    ) + 2 * cellPad;

    if (y + rowH > bottom()) {
      doc.addPage();
      y = 30;
      drawHeader();
      doc.font('Helvetica').fontSize(9);
    }

    if (ri % 2 === 1) {
      doc.rect(M, y, tableW, rowH).fill('#F3F7F4');
    }
    doc.fillColor('#1F2937');
    texts.forEach((t, i) => {
      doc.text(t, M + i * colWidth + cellPad, y + cellPad, { width: colWidth - 2 * cellPad });
    });
    // row separator line
    doc.moveTo(M, y + rowH).lineTo(M + tableW, y + rowH).lineWidth(0.4).strokeColor('#E5E7EB').stroke();
    y += rowH;
  });

  // footer
  doc.font('Helvetica').fontSize(7.5).fillColor('#9CA3AF')
    .text('Powered by Eptomart | An Eptosi Group Company', M, doc.page.height - 26, { width: tableW, align: 'center' });

  doc.end();
};

module.exports = { exportToExcel, exportToPDF };
