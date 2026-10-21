const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { readInput, writeReport } = require('./dataHandler');
const { runJob } = require('./automation');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Ensure directories exist ----------
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const REPORT_DIR = path.join(__dirname, 'public', 'reports');
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

// ---------- Middleware & Static Files ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve evidence folder statically so the UI can load images
app.use('/evidence', express.static(EVIDENCE_DIR));

// ---------- Multer Config ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});

const ALLOWED_EXT = new Set(['.xlsx', '.json']);
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) return cb(new Error('Only .xlsx and .json files are allowed'));
    cb(null, true);
  }
});

// ---------- Global Status ----------
const statusState = {
  status: 'idle', // 'idle', 'processing', 'Running', 'error'
  logs: [],
  parsedData: [],
  batchProgress: [] // Holds ALL jobs for the UI history
};

function addLog(message) {
  statusState.logs.push({ time: new Date().toLocaleTimeString(), message });
}

// ---------- Routes ----------

// 1. Status Endpoint
app.get('/api/status', (req, res) => {
  res.json(statusState);
});

// 2. Upload Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  addLog(`Uploaded ${req.file.originalname}`);
  statusState.status = 'processing';
  statusState.parsedData = [];
  statusState.batchProgress = [];

  res.json({ ok: true, message: 'File uploaded.' });

  try {
    const rows = await readInput(req.file.path);
    addLog(`Parsed ${rows.length} rows.`);

    // Map strictly to ProjectName and Environment
    const results = rows.map((row, index) => {
      return {
        ProjectName: row.ProjectName || row.name || row.Name || `Project ${index + 1}`,
        Environment: row.Environment || row.environment || row.Env || row.env || 'N/A'
      };
    });

    statusState.parsedData = results;
    statusState.status = 'idle';
    addLog('Data ready for automation.');
  } catch (err) {
    statusState.status = 'error';
    addLog(`Error processing file: ${err.message}`);
  }
});

// 3. Start Batch Process
app.post('/api/start', async (req, res) => {
  if (statusState.status === 'Running') {
    return res.status(400).json({ error: 'A job is already running' });
  }

  const rows = statusState.parsedData;
  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: 'No data available. Upload a file first.' });
  }

  statusState.status = 'Running';
  statusState.batchProgress = []; // Reset UI history for the new run
  res.json({ ok: true, message: 'Batch process started' });

  try {
    const BATCH_SIZE = 4;
    const allResults = [];

    // Iterate through rows in chunks of 4
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      addLog(`Starting Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} jobs)`);

      // Create the cards and ADD them to the master list so they stay on screen
      const newBatchCards = batch.map((row, index) => ({
        jobId: `Job_${i + index + 1}`,
        projectName: row.ProjectName,
        environment: row.Environment,
        status: 'Running'
      }));
      statusState.batchProgress.push(...newBatchCards);

      // Run the current batch in parallel
      const batchPromises = batch.map(async (row, index) => {
        const jobId = `Job_${i + index + 1}`;
        
        // Run Playwright
        const result = await runJob(row, jobId);
        
        // Update the specific job card in the master list (global index i + index)
        statusState.batchProgress[i + index].status = result.status;
        
        // --- NEW: Log the result to the UI Terminal ---
        if (result.status === 'Failed') {
          addLog(`❌ ${jobId} (${row.ProjectName}) FAILED: ${result.message}`);
        } else {
          addLog(`✅ ${jobId} (${row.ProjectName}) Passed`);
        }
        // Return the enriched row for the final Excel report
        return { 
          "Job Name": jobId, 
          "Project Name": row.ProjectName, 
          "Environment": row.Environment, 
          "Status": result.status 
        };
      });

      // CRUCIAL: Wait for all 4 in this batch to finish before looping to the next
      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
      
      addLog(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completed`);
    }

    // ---------- Generate Final Report ----------
    addLog(`All jobs complete. Generating final report...`);
    const reportPath = path.join(REPORT_DIR, 'Final_Report.xlsx');
    
    await writeReport(allResults, reportPath);

    statusState.status = 'idle';
    addLog(`Final report generated successfully!`);

  } catch (err) {
    statusState.status = 'error';
    addLog(`Batch process failed: ${err.message}`);
  }
});

// 4. Download Report Endpoint
app.get('/api/download-report', (req, res) => {
  const reportPath = path.join(REPORT_DIR, 'Final_Report.xlsx');
  if (fs.existsSync(reportPath)) {
    res.download(reportPath, 'Final_Report.xlsx');
  } else {
    res.status(404).send('Report not found. Run a batch first.');
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});