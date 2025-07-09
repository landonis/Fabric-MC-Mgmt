import express from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import authenticateToken from '../middleware/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = express.Router();

const WORLD_PATH = process.env.WORLD_PATH || '/home/ubuntu/Minecraft/world';
const TEMP_PATH = process.env.TEMP_PATH || '/tmp/minecraft-imports';

// Ensure directories exist
if (!fs.existsSync(TEMP_PATH)) {
  fs.mkdirSync(TEMP_PATH, { recursive: true });
}

// Configure multer to accept only .tar files
const upload = multer({
  dest: TEMP_PATH,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb: FileFilterCallback) => {
    if (!file.originalname.endsWith('.tar')) {
      cb(new Error('Only .tar files are allowed'));
    } else {
      cb(null, true);
    }
  }
});

// GET /api/world/info
router.get('/info', authenticateToken, (req, res) => {
  try {
    const worldExists = fs.existsSync(WORLD_PATH);
    let worldInfo = {
      exists: worldExists,
      name: 'world',
      size: 0,
      sizeFormatted: '0 MB'
    };

    if (worldExists) {
      try {
        const stats = fs.statSync(WORLD_PATH);
        const sizeInBytes = getDirectorySize(WORLD_PATH);
        worldInfo.size = sizeInBytes;
        worldInfo.sizeFormatted = formatBytes(sizeInBytes);
      } catch (error) {
        console.warn('Could not get world size:', error);
      }
    }

    res.json(worldInfo);
  } catch (error) {
    console.error('Error getting world info:', error);
    res.status(500).json({ error: 'Failed to get world information' });
  }
});

// GET /api/world/export
router.get('/export', authenticateToken, async (req, res) => {
  try {
    if (!fs.existsSync(WORLD_PATH)) {
      return res.status(404).json({ error: 'World not found' });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const backupName = `world-backup-${timestamp}.tar`;
    const backupPath = path.join(TEMP_PATH, backupName);

    // Create tar archive
    await execAsync(`tar -cf "${backupPath}" -C "${path.dirname(WORLD_PATH)}" "${path.basename(WORLD_PATH)}"`);

    // Send file
    res.download(backupPath, backupName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up temp file
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export world' });
  }
});

// POST /api/world/upload
router.post('/import', authenticateToken, upload.single('world'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const tempFilePath = file.path;
    const extractPath = path.join(TEMP_PATH, `extract-${Date.now()}`);

    try {
      // Create extraction directory
      fs.mkdirSync(extractPath, { recursive: true });

      // Extract to temp directory first
      await execAsync(`tar -xf "${tempFilePath}" -C "${extractPath}"`);

      // Find the world directory in extracted content
      const extractedContents = fs.readdirSync(extractPath);
      let worldDir = null;

      // Look for level.dat to identify world directory
      for (const item of extractedContents) {
        const itemPath = path.join(extractPath, item);
        if (fs.statSync(itemPath).isDirectory()) {
          const levelDatPath = path.join(itemPath, 'level.dat');
          if (fs.existsSync(levelDatPath)) {
            worldDir = itemPath;
            break;
          }
        }
      }

      // Check if level.dat exists in root of extraction
      if (!worldDir && fs.existsSync(path.join(extractPath, 'level.dat'))) {
        worldDir = extractPath;
      }

      if (!worldDir) {
        throw new Error('Invalid world archive: level.dat not found');
      }

      // Stop the server before replacing world
      console.log('Stopping Minecraft server...');
      try {
        await execAsync('systemctl stop minecraft-server');
      } catch (error) {
        console.warn('Could not stop server via systemctl:', error);
      }

      // Backup existing world if it exists
      if (fs.existsSync(WORLD_PATH)) {
        const backupPath = `${WORLD_PATH}.backup.${Date.now()}`;
        console.log(`Backing up existing world to ${backupPath}`);
        fs.renameSync(WORLD_PATH, backupPath);
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(WORLD_PATH);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      // Move extracted world to final location
      if (worldDir === extractPath) {
        // World files are in root of extraction
        fs.renameSync(extractPath, WORLD_PATH);
      } else {
        // World files are in subdirectory
        fs.renameSync(worldDir, WORLD_PATH);
        // Clean up extraction directory
        fs.rmSync(extractPath, { recursive: true, force: true });
      }

      // Set proper permissions
      try {
        await execAsync(`chown -R minecraft:minecraft "${WORLD_PATH}"`);
      } catch (error) {
        console.warn('Could not set world permissions:', error);
      }

      // Start the server
      console.log('Starting Minecraft server...');
      try {
        await execAsync('systemctl start minecraft-server');
      } catch (error) {
        console.warn('Could not start server via systemctl:', error);
      }

      res.json({ 
        success: true, 
        message: 'World imported successfully. Server has been restarted.' 
      });

    } catch (extractError) {
      console.error('Extraction/import error:', extractError);
      
      // Clean up on error
      if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
      }
      
      throw extractError;
    } finally {
      // Clean up uploaded file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

  } catch (error) {
    console.error('Import failed:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to import world' 
    });
  }
});

// Helper functions
function getDirectorySize(dirPath: string): number {
  let totalSize = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.warn('Error calculating directory size:', error);
  }
  
  return totalSize;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;