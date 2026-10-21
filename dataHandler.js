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
// Add this to the bottom of dataHandler.js
async function writeHtmlReport(results, outputPath) {
  let tableRows = '';
  results.forEach(r => {
    const statusColor = r.Status === 'Passed' ? '#d4edda' : '#f8d7da';
    tableRows += `
      <tr style="background-color: ${statusColor};">
        <td>${r["Job Name"]}</td>
        <td>${r["Project Name"]}</td>
        <td>${r["Environment"]}</td>
        <td>${r.Office}</td>
        <td><strong>${r.Status}</strong></td>
        <td>${r["Extracted Project Number"]}</td>
        <td>${r["Extracted Page Job Name"]}</td>
      </tr>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Automation Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #343a40; color: white; }
      </style>
    </head>
    <body>
      <h1>Test Execution Report</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <tr>
          <th>Job Name</th><th>Project Name</th><th>Environment</th>
          <th>Office</th><th>Status</th><th>Extracted Project #</th><th>Extracted Job Name</th>
        </tr>
        ${tableRows}
      </table>
    </body>
    </html>
  `;
  
  require('fs').writeFileSync(outputPath, html);
}

module.exports = { readInput, writeReport, writeHtmlReport };