import React from 'react';
import { ErrorPanel } from '../components/ErrorPanel';
import { ServerUpdateButton } from '../components/ServerUpdateButton';
import { Layout } from '../components/Layout';

export default function DashboardPage() {
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">📊 Server Dashboard</h1>
      <ErrorPanel />
      <ServerUpdateButton />
    </Layout>
  );
}
