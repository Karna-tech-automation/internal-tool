const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Ensure uploads/ exists ----------
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Multer config ----------
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB cap
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error('Only .xlsx and .json files are allowed'));
    }
    cb(null, true);
  }
});

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- In-memory status (Phase 1 only) ----------
const statusState = {
  status: 'idle',
  logs: []
};

function addLog(message) {
  statusState.logs.push({ time: new Date().toISOString(), message });
}

// ---------- Routes ----------
app.get('/api/status', (req, res) => {
  res.json(statusState);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Field name must be "file".' });
  }

  addLog(`Uploaded ${req.file.originalname}`);

  res.json({
    ok: true,
    file: {
      originalName: req.file.originalname,
      savedAs: req.file.filename,
      size: req.file.size
    }
  });
});

// ---------- Error handler (catches multer errors too) ----------
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).json({ error: err.message });
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});