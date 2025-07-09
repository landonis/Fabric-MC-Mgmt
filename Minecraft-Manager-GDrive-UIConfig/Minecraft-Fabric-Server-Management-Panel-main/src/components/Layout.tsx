import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <nav className="bg-white border-b px-4 py-3 shadow flex justify-between items-center">
        <div className="flex space-x-4">
          <Link to="/" className="font-semibold hover:text-blue-600">Dashboard</Link>
          <Link to="/players" className="hover:text-blue-600">Players</Link>
          <Link to="/users" className="hover:text-blue-600">Users</Link>
          <Link to="/map" className="hover:text-blue-600">Map</Link>
        </div>
        <button onClick={handleLogout} className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
          Logout
        </button>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
};
