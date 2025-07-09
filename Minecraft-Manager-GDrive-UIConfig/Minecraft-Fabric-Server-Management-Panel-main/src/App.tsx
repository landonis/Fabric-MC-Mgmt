import React from 'react';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import { AuthContext, useAuthProvider } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import { AuthForm } from './components/AuthForm';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import { Dashboard } from './components/Dashboard';

function App() {
  const auth = useAuthProvider();

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      {auth.user ? (
        <Dashboard />
      ) : (
        <AuthForm onLogin={auth.login} onRegister={auth.register} />
      )}
    </AuthContext.Provider>
  );
}

export default App;