const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

/**
 * Reads an uploaded Excel (.xlsx) or JSON file.
 * Returns an array of objects (rows).
 */
async function readInput(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  // 1. Handle JSON
  if (ext === '.json') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  }

  // 2. Handle Excel
  if (ext === '.xlsx') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0]; // Read the first sheet
    const rows = [];
    let headers = [];

    worksheet.eachRow((row, rowNumber) => {
      // exceljs row.values is 1-indexed, so we slice(1) to remove the empty first element
      const values = row.values.slice(1);

      if (rowNumber === 1) {
        // First row is headers
        headers = values;
      } else {
        // Map row values to header keys
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

/**
 * Takes an array of objects and writes them to an Excel file.
 */
async function writeReport(results, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Results');

  if (results.length === 0) {
    // If empty, just write the expected headers
    worksheet.addRow(['ProjectName', 'Status', 'Time']);
  } else {
    // Use the keys of the first object as column headers
    const headers = Object.keys(results[0]);
    
    // Set up columns with headers and auto-width
    worksheet.columns = headers.map(key => ({ 
      header: key, 
      key: key, 
      width: 25 
    }));

    // Add the data rows
    results.forEach(item => {
      worksheet.addRow(item);
    });

    // Make headers bold
    worksheet.getRow(1).font = { bold: true };
  }

  // Save to disk
  await workbook.xlsx.writeFile(outputPath);
}

module.exports = { readInput, writeReport };