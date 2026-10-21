const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function readInput(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  }

  if (ext === '.xlsx') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    const rows = [];
    let headers = [];

    worksheet.eachRow((row, rowNumber) => {
      const values = row.values.slice(1);
      if (rowNumber === 1) {
        headers = values;
      } else {
        const rowData = {};
        values.forEach((val, index) => {
          const header = headers[index] || `Column${index + 1}`;
          rowData[header] = val;
        });
        rows.push(rowData);
      }
    });
    return rows;
  }
  throw new Error('Unsupported file type');
}

async function writeReport(results, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Results');

    if (results.length === 0) {
    worksheet.addRow(['Job Name', 'Project Name', 'Environment', 'Status', 'Office']);
  } else {
    const headers = Object.keys(results[0]);
    worksheet.columns = headers.map(key => ({ header: key, key: key, width: 25 }));
    results.forEach(item => worksheet.addRow(item));

    // Styling: Make headers bold
    worksheet.getRow(1).font = { bold: true };

    // Styling: Color-code the Status column
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const statusCell = row.getCell('Status');
        if (statusCell.value === 'Passed') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }; // Light Green
          statusCell.font = { color: { argb: 'FF155724' }, bold: true };
        } else if (statusCell.value === 'Failed') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } }; // Light Red
          statusCell.font = { color: { argb: 'FF721C24' }, bold: true };
        }
      }
    });
  }

  await workbook.xlsx.writeFile(outputPath);
}

module.exports = { readInput, writeReport };