import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../database/init';
import authenticateToken from '../middleware/auth';

const router = express.Router();

const MODS_PATH = process.env.MODS_PATH || '/home/ubuntu/Minecraft/mods';

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
    fileSize: parseInt(process.env.MAX_MOD_SIZE || '104857600'), // 100MB default
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
    const mods = db.prepare('SELECT id, filename, original_name, size, active, uploaded_at FROM mods ORDER BY uploaded_at DESC').all();
    res.json(mods);
  } catch (error) {
    console.error('Error fetching mods:', error);
    res.status(500).json({ error: 'Failed to fetch mods' });
  }
});

router.post('/', authenticateToken, upload.single('mod'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Mod file is required' });
  }

  const { originalname, filename, size } = req.file;
  const userId = req.user?.id;

  try {
    // Calculate checksum for file integrity
    const crypto = require('crypto');
    const fileBuffer = require('fs').readFileSync(req.file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    const result = db.prepare(
      'INSERT INTO mods (original_name, filename, size, active, uploaded_by, checksum, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(originalname, filename, size, 1, userId, checksum);

    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      filename: originalname,
      size: size
    });
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
  
  // Validate ID
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid mod ID' });
  }
  
  try {
    const mod = db.prepare('SELECT filename FROM mods WHERE id = ?').get(id) as { filename: string } | undefined;

    if (!mod) {
      return res.status(404).json({ error: 'Mod not found' });
    }

    const filePath = path.join(MODS_PATH, mod.filename);
    
    // Remove file if it exists
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileError) {
        console.warn('Failed to delete mod file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Remove from database
    db.prepare('DELETE FROM mods WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mod:', error);
    res.status(500).json({ error: 'Failed to delete mod' });
  }
});

// GET /api/mods/:id/toggle - Toggle mod active status
router.post('/:id/toggle', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid mod ID' });
  }
  
  try {
    const mod = db.prepare('SELECT id, active FROM mods WHERE id = ?').get(id) as { id: number, active: number } | undefined;
    
    if (!mod) {
      return res.status(404).json({ error: 'Mod not found' });
    }
    
    const newActiveState = mod.active === 1 ? 0 : 1;
    db.prepare('UPDATE mods SET active = ? WHERE id = ?').run(newActiveState, id);
    
    res.json({ 
      success: true, 
      active: newActiveState === 1,
      message: `Mod ${newActiveState === 1 ? 'activated' : 'deactivated'}` 
    });
  } catch (error) {
    console.error('Error toggling mod:', error);
    res.status(500).json({ error: 'Failed to toggle mod status' });
  }
});

export default router;
