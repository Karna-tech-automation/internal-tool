require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip'); // <-- NEW ZIP LIBRARY

const { readInput, writeReport } = require('./dataHandler');
const { runJob, stopAllBrowsers } = require('./automation');

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
app.use('/evidence', express.static(EVIDENCE_DIR));

// ---------- Multer Config ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.json'].includes(ext)) return cb(new Error('Only .xlsx and .json allowed'));
    cb(null, true);
  }
});

// ---------- Global State ----------
const statusState = {
  status: 'idle',
  logs: [],
  parsedData: [],
  batchProgress: [],
  totalJobs: 0,
  completedJobs: 0
};

function addLog(message) {
  statusState.logs.push({ time: new Date().toLocaleTimeString(), message });
}

// ---------- Routes ----------
app.get('/api/status', (req, res) => res.json(statusState));

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  addLog(`Uploaded ${req.file.originalname}`);
  statusState.status = 'processing';
  statusState.parsedData = [];
  statusState.batchProgress = [];
  statusState.totalJobs = 0;
  statusState.completedJobs = 0;

  res.json({ ok: true });

  try {
    const rows = await readInput(req.file.path);
    addLog(`Parsed ${rows.length} rows.`);

    const results = rows.map((row, index) => ({
      ProjectName: row.ProjectName || row.name || row.Name || `Project ${index + 1}`,
      Environment: row.Environment || row.environment || row.Env || row.env || 'N/A',
      Office: row.Office || row.office || 'N/A',
      TestName: row.TestName || 'CreateEmployee',
      InputValue: row.InputValue || row.ProjectName || 'Default'
    }));

    statusState.parsedData = results;
    statusState.totalJobs = results.length;
    statusState.status = 'idle';
  } catch (err) {
    statusState.status = 'error';
    addLog(`Error: ${err.message}`);
  }
});

app.post('/api/start', async (req, res) => {
  if (statusState.status === 'Running') return res.status(400).json({ error: 'Already running' });

  const rows = statusState.parsedData;
  if (!rows || rows.length === 0) return res.status(400).json({ error: 'No data.' });

  statusState.status = 'Running';
  statusState.batchProgress = [];
  statusState.completedJobs = 0;
  res.json({ ok: true });

  try {
    const BATCH_SIZE = 4;
    const allResults = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      if (statusState.status !== 'Running') {
        addLog(`Batch process stopped by user.`);
        break;
      }

      const batch = rows.slice(i, i + BATCH_SIZE);
      addLog(`Starting Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} jobs)`);

      const newBatchCards = batch.map((row, index) => ({
        jobId: `Job_${i + index + 1}`,
        projectName: row.ProjectName,
        environment: row.Environment,
        status: 'Running',
        duration: ''
      }));
      statusState.batchProgress.push(...newBatchCards);

      const batchPromises = batch.map(async (row, index) => {
        if (statusState.status !== 'Running') return null;

        const jobId = `Job_${i + index + 1}`;
        const result = await runJob(row, jobId);
        
        statusState.batchProgress[i + index].status = result.status;
        statusState.batchProgress[i + index].duration = result.duration;
        statusState.completedJobs++;

        if (result.status === 'Failed') {
          addLog(`❌ ${jobId} (${row.ProjectName}) FAILED: ${result.message}`);
        } else {
          addLog(`✅ ${jobId} (${row.ProjectName}) Passed [${result.duration}]`);
        }
        
        return { 
          "Job Name": jobId, 
          "Project Name": row.ProjectName, 
          "Environment": row.Environment, 
          "Status": result.status,
          "Office": row.Office
        };
      });

      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults.filter(r => r !== null));
    }

    addLog(`Generating final report...`);
    const reportPath = path.join(REPORT_DIR, 'Final_Report.xlsx');
    await writeReport(allResults, reportPath);

    statusState.status = 'idle';
    addLog(`Process finished.`);

  } catch (err) {
    statusState.status = 'error';
    addLog(`Batch failed: ${err.message}`);
  }
});

app.post('/api/stop', async (req, res) => {
  if (statusState.status !== 'Running') return res.json({ ok: true });
  
  statusState.status = 'Stopping';
  addLog('Stop requested. Killing active browsers...');
  await stopAllBrowsers();
  
  statusState.status = 'idle';
  res.json({ ok: true });
});

app.get('/api/download-report', (req, res) => {
  const reportPath = path.join(REPORT_DIR, 'Final_Report.xlsx');
  if (fs.existsSync(reportPath)) {
    res.download(reportPath, 'Final_Report.xlsx');
  } else {
    res.status(404).send('Report not found.');
  }
});

// --- 6. Download Evidence as ZIP (adm-zip Method) ---
app.get('/api/download-evidence', (req, res) => {
  const evidencePath = path.join(__dirname, 'evidence');
  
  if (!fs.existsSync(evidencePath) || fs.readdirSync(evidencePath).length === 0) {
    return res.status(404).send('No evidence found to download.');
  }

  try {
    // This creates the zip file in memory instantly. No streams, no crashes.
    const zip = new AdmZip();
    zip.addLocalFolder(evidencePath);
    const zipBuffer = zip.toBuffer();
    
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename="Evidence_${Date.now()}.zip"`);
    res.send(zipBuffer);
  } catch (err) {
    console.error("ZIP Error:", err);
    res.status(500).send("Failed to create zip file: " + err.message);
  }
});

// 7. Delete Evidence Folder
app.delete('/api/delete-evidence', (req, res) => {
  const evidencePath = path.join(__dirname, 'evidence');
  
  if (fs.existsSync(evidencePath)) {
    const files = fs.readdirSync(evidencePath);
    for (const file of files) {
      fs.rmSync(path.join(evidencePath, file), { recursive: true, force: true });
    }
  }
  res.json({ ok: true, message: 'Evidence cleared successfully' });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));