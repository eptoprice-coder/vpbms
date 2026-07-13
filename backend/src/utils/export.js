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

// Streams a simple tabular PDF report directly to the HTTP response.
const exportToPDF = (res, { title, columns, rows }) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).text(title, { align: 'center' });
  doc.moveDown();

  const colWidth = (doc.page.width - 60) / columns.length;
  let y = doc.y;

  doc.fontSize(9).font('Helvetica-Bold');
  columns.forEach((c, i) => {
    doc.text(c.header, 30 + i * colWidth, y, { width: colWidth });
  });
  doc.moveDown();
  doc.font('Helvetica');

  rows.forEach((row) => {
    y = doc.y;
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.y;
    }
    columns.forEach((c, i) => {
      doc.text(String(row[c.key] ?? ''), 30 + i * colWidth, y, { width: colWidth });
    });
    doc.moveDown(0.6);
  });

  doc.end();
};

module.exports = { exportToExcel, exportToPDF };
