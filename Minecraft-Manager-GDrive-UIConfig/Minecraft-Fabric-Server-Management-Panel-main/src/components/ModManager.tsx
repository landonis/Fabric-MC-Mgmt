import React, { useState, useEffect } from 'react';
import { Upload, Package, Trash2, Download } from 'lucide-react';
import { api } from '../utils/api';
import { ModFile } from '../types';

export const ModManager: React.FC = () => {
  const [mods, setMods] = useState<ModFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fetchMods = async () => {
    try {
      const response = await api.getMods();
      setMods(response.data);
    } catch (err) {
      setError('Failed to fetch mods');
    }
  };

  useEffect(() => {
    fetchMods();
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.jar')) {
      setError('Only .jar files are allowed');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.uploadMod(file);
      await fetchMods();
    } catch (err) {
      setError('Failed to upload mod');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDeleteMod = async (id: number) => {
    if (!confirm('Are you sure you want to delete this mod?')) return;

    try {
      await api.deleteMod(id);
      await fetchMods();
    } catch (err) {
      setError('Failed to delete mod');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
        <Package className="h-5 w-5 mr-2" />
        Mod Manager
      </h2>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-900/20'
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-300 mb-2">Drag and drop .jar files here or</p>
        <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
          <input
            type="file"
            accept=".jar"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />
          Choose File
        </label>
      </div>

      <div className="space-y-3">
        {mods.map((mod) => (
          <div
            key={mod.id}
            className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
          >
            <div className="flex items-center">
              <Package className="h-5 w-5 text-blue-400 mr-3" />
              <div>
                <h3 className="text-white font-medium">{mod.filename}</h3>
                <p className="text-gray-400 text-sm">
                  {formatFileSize(mod.size)} • Uploaded {new Date(mod.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${mod.active ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className="text-sm text-gray-400 mr-3">
                {mod.active ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => handleDeleteMod(mod.id)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        
        {mods.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No mods installed yet. Upload your first mod above.
          </div>
        )}
      </div>
    </div>
  );
};