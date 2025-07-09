import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, Activity, Users, Clock, HardDrive, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import { ServerStatus } from '../types';

export const ServerControls: React.FC = () => {
  const [status, setStatus] = useState<ServerStatus>({ running: false });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const response = await api.getServerStatus();
      setStatus(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch server status');
      setStatus({ running: false });
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleServerAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(action);
    setError('');

    try {
      if (action === 'start') {
        await api.startServer();
      } else if (action === 'stop') {
        await api.stopServer();
      } else {
        await api.restartServer();
      }
      
      // Wait a moment then refresh status
      setTimeout(fetchStatus, 2000);
    } catch (err: any) {
      setError(err.message || `Failed to ${action} server`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = () => {
    if (status.running) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (actionLoading) {
      return `${actionLoading.charAt(0).toUpperCase() + actionLoading.slice(1)}ing...`;
    }
    return status.running ? 'Running' : 'Stopped';
  };

  const getStatusTextColor = () => {
    if (actionLoading) return 'text-yellow-400';
    return status.running ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Server Controls
        </h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor()} ${actionLoading ? 'animate-pulse' : ''}`} />
          <span className={`text-sm font-medium ${getStatusTextColor()}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Players</span>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{status.players || 0}</p>
          <p className="text-xs text-gray-400">Currently online</p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Uptime</span>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{status.uptime || '--'}</p>
          <p className="text-xs text-gray-400">Since last start</p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Memory</span>
            <HardDrive className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{status.memory || '--'}</p>
          <p className="text-xs text-gray-400">RAM usage</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleServerAction('start')}
          disabled={actionLoading !== null || status.running}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="h-4 w-4 mr-2" />
          {actionLoading === 'start' ? 'Starting...' : 'Start Server'}
        </button>
        
        <button
          onClick={() => handleServerAction('stop')}
          disabled={actionLoading !== null || !status.running}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Square className="h-4 w-4 mr-2" />
          {actionLoading === 'stop' ? 'Stopping...' : 'Stop Server'}
        </button>
        
        <button
          onClick={() => handleServerAction('restart')}
          disabled={actionLoading !== null}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {actionLoading === 'restart' ? 'Restarting...' : 'Restart Server'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-100">
              Systemd Integration
            </h3>
            <div className="mt-2 text-sm text-blue-200">
              <p>
                Server management is handled by systemd for maximum reliability. 
                The server will automatically restart on failure and persist across system reboots.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};