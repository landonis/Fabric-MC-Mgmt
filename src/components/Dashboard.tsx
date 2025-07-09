import React from 'react';
import { LogOut, Server, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ServerControls } from './ServerControls';
import { ModManager } from './ModManager';
import { WorldManager } from './WorldManager';
import { PlayerViewer } from './PlayerViewer';
import { PasswordChangeModal } from './PasswordChangeModal';

export const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);

  // Show password change modal if user must change password
  React.useEffect(() => {
    if (user?.mustChangePassword) {
      setShowPasswordModal(true);
    }
  }, [user]);

  const handlePasswordChangeSuccess = () => {
    setShowPasswordModal(false);
    refreshUser();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-blue-400 mr-3" />
              <h1 className="text-xl font-bold text-white">
                Minecraft Server Manager
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.username}</span>
              {user?.isAdmin && (
                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                  Admin
                </span>
              )}
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center px-3 py-2 text-gray-300 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
              <button
                onClick={logout}
                className="flex items-center px-3 py-2 text-gray-300 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          <ServerControls />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ModManager />
            <WorldManager />
          </div>
          
          <PlayerViewer />
        </div>
      </main>

      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordChangeSuccess}
        isRequired={user?.mustChangePassword}
      />
    </div>
  );
};