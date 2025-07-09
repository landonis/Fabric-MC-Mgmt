import React, { useState, useEffect } from 'react';
import { Globe, Download, Upload, Archive, AlertTriangle, Info } from 'lucide-react';
import { api } from '../utils/api';

interface WorldInfo {
  exists: boolean;
  name: string;
  size: number;
  sizeFormatted?: string;
}

export const WorldManager: React.FC = () => {
  const [worldInfo, setWorldInfo] = useState<WorldInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fetchWorldInfo = async () => {
    try {
      const response = await api.getWorldInfo();
      setWorldInfo(response.data);
    } catch (err) {
      console.warn('Failed to fetch world info:', err);
    }
  };

  useEffect(() => {
    fetchWorldInfo();
  }, []);

  const handleExportWorld = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const blob = await api.exportWorld();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `world-backup-${new Date().toISOString().split('T')[0]}.tar`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setSuccess('World exported successfully!');
    } catch (err) {
      setError('Failed to export world');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.tar')) {
      setError('Only .tar files are allowed');
      return;
    }

    setPendingFile(file);
    setShowConfirmDialog(true);
  };

  const handleConfirmImport = async () => {
    if (!pendingFile) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setShowConfirmDialog(false);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await api.importWorld(pendingFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadProgress(0);
        setSuccess('World imported successfully! The server has been restarted with the new world.');
        fetchWorldInfo();
      }, 500);
    } catch (err) {
      setError('Failed to import world');
      setUploadProgress(0);
    } finally {
      setLoading(false);
      setPendingFile(null);
    }
  };

  const handleCancelImport = () => {
    setShowConfirmDialog(false);
    setPendingFile(null);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
        <Globe className="h-5 w-5 mr-2" />
        World Manager
      </h2>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* World Info */}
      {worldInfo && (
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <Info className="h-5 w-5 text-blue-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Current World</h3>
          </div>
          <div className="text-gray-300">
            <p><strong>Name:</strong> {worldInfo.name}</p>
            {worldInfo.exists && (
              <p><strong>Size:</strong> {worldInfo.sizeFormatted || 'Unknown'}</p>
            )}
            <p><strong>Status:</strong> {worldInfo.exists ? 'Active' : 'No world found'}</p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Importing world...</span>
            <span className="text-sm text-gray-300">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Download className="h-5 w-5 text-blue-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Export World</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Download your current world as a .tar archive for backup or transfer.
          </p>
          <button
            onClick={handleExportWorld}
            disabled={loading || !worldInfo?.exists}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Archive className="h-4 w-4 mr-2" />
            {loading ? 'Exporting...' : 'Export World'}
          </button>
        </div>

        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Upload className="h-5 w-5 text-green-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Import World</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Replace your current world with a .tar archive. This will overwrite existing world data.
          </p>
          <label className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors">
            <input
              type="file"
              accept=".tar"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              disabled={loading}
            />
            <Archive className="h-4 w-4 mr-2" />
            {loading ? 'Importing...' : 'Import World'}
          </label>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-400 mr-3" />
              <h3 className="text-lg font-semibold text-white">Confirm World Import</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Are you sure you want to import this world? This action will:
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-1 mb-4">
                <li>Stop the Minecraft server</li>
                <li>Backup your current world</li>
                <li>Replace it with the uploaded world</li>
                <li>Restart the server</li>
              </ul>
              <p className="text-yellow-300 text-sm">
                <strong>File:</strong> {pendingFile?.name}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleConfirmImport}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Import World
              </button>
              <button
                onClick={handleCancelImport}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-100">
              Important Safety Notice
            </h3>
            <div className="mt-2 text-sm text-yellow-200">
              <p>
                World import automatically stops the server, validates the archive, backs up your current world, 
                and restarts the server. Only valid Minecraft world archives (.tar) with level.dat are accepted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};