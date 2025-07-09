import React, { useEffect, useState } from 'react';

export const ErrorPanel: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/players');
        if (!res.ok) throw new Error('Mod not connected or data missing');
        const data = await res.json();
        if (data.players?.some((p: any) => p.uuid === 'mock-uuid')) {
          setError('⚠️ The Fabric mod is not connected — mock data is being used.');
        }
      } catch (err: any) {
        setError(`🚨 Error fetching player data: ${err.message}`);
      }
    };
    check();
  }, []);

  if (!error) return null;

  return (
    <div className="bg-yellow-100 text-yellow-800 border border-yellow-300 p-3 mb-4 rounded shadow">
      {error}
    </div>
  );
};
