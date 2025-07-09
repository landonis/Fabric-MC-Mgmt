import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../database/init';
import authenticateToken from '../middleware/auth';

const router = express.Router();

const MODS_PATH = process.env.MODS_PATH || '/opt/minecraft/mods';

// Ensure mods directory exists
if (!fs.existsSync(MODS_PATH)) {
  fs.mkdirSync(MODS_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MODS_PATH);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    cb(null, `${timestamp}-${randomSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname) !== '.jar') {
      return cb(new Error('Only .jar files are allowed') as unknown as null, false);
    }
    cb(null, true);
  }
});

router.get('/', authenticateToken, (_req, res) => {
  try {
    const mods = db.prepare('SELECT * FROM mods ORDER BY uploaded_at DESC').all();
    res.json(mods);
  } catch (error) {
    console.error('Error fetching mods:', error);
    res.status(500).json({ error: 'Failed to fetch mods' });
  }
});

router.post('/', authenticateToken, upload.single('mod'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Mod file is required' });

  const { originalname, filename, size } = req.file;

  
  try {
    const result = db.prepare(
      'INSERT INTO mods (original_name, filename, size, active, uploaded_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(originalname, filename, size, 1);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error saving mod:', error);
    // Clean up uploaded file on database error
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to save mod' });
  }
});

router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  try {
    const mod = db.prepare('SELECT * FROM mods WHERE id = ?').get(id) as { filename: string } | undefined;

    if (!mod) return res.status(404).json({ error: 'Mod not found' });

    const filePath = path.join(MODS_PATH, mod.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM mods WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mod:', error);
    res.status(500).json({ error: 'Failed to delete mod' });
  }
});

export default router;
