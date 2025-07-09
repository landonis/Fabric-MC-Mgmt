import React, { useEffect, useState } from 'react';

type User = {
  id: number;
  username: string;
  isAdmin: boolean;
};

import { Layout } from '../components/Layout';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]</Layout>);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/users')
      .then(res => res.json())
      .then(data => setUsers(data.users || []));
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, isAdmin })
    });
    setUsername('');
    setPassword('');
    setIsAdmin(false);
    const res = await fetch('/api/auth/users');
    const data = await res.json();
    setUsers(data.users);
  };

  return (<Layout>
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">👥 User Management</h2>
      <form onSubmit={createUser} className="mb-6 space-y-2">
        <input className="w-full p-2 border rounded" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required />
        <input className="w-full p-2 border rounded" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
        <label className="block">
          <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
          <span className="ml-2">Admin</span>
        </label>
        <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Add User</button>
      </form>
      <ul className="space-y-1">
        {users.map(user => (
          <li key={user.id} className="p-2 border rounded bg-white shadow-sm">
            {user.username} {user.isAdmin && <strong className="ml-1 text-blue-600">(admin)</strong>}
          </li>
        ))}
      </ul>
    </div>
  );
}
