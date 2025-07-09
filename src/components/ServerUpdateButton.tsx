import React, { useState } from 'react';

export const ServerUpdateButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerUpdate = async () => {
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const res = await fetch('/api/server/update', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setOutput(data.output);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border p-4 rounded bg-white shadow w-full max-w-md">
      <h3 className="font-bold mb-2 text-lg">🔄 Server Update</h3>
      <p className="text-sm mb-2 text-gray-600">
        Click below to update the Minecraft Fabric server with the latest Fabric installer and restart the server.
      </p>
      <button
        onClick={triggerUpdate}
        disabled={loading}
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? 'Updating...' : 'Trigger Update'}
      </button>
      {output && (
        <pre className="mt-3 bg-gray-100 text-sm p-2 rounded overflow-x-auto max-h-48">{output}</pre>
      )}
      {error && (
        <div className="mt-2 text-red-500 text-sm font-semibold">Error: {error}</div>
      )}
    </div>
  );
};
