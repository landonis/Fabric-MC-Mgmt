import React, { useState, useEffect } from 'react';
import { 
  Users, User, Clock, Activity, ChevronDown, ChevronRight, 
  Package, MapPin, MessageSquare, UserX, RefreshCw 
} from 'lucide-react';
import { api } from '../utils/api';
import { Player, PlayerInventory, PlayerPosition } from '../types';

export const PlayerViewer: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [playerInventories, setPlayerInventories] = useState<Record<string, PlayerInventory>>({});
  const [playerPositions, setPlayerPositions] = useState<Record<string, PlayerPosition>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await api.getPlayers();
      setPlayers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerDetails = async (uuid: string) => {
    try {
      const [inventoryResponse, positionResponse] = await Promise.all([
        api.getPlayerInventory(uuid),
        api.getPlayerPosition(uuid)
      ]);
      
      setPlayerInventories(prev => ({
        ...prev,
        [uuid]: inventoryResponse.data
      }));
      
      setPlayerPositions(prev => ({
        ...prev,
        [uuid]: positionResponse.data
      }));
    } catch (err) {
      console.warn('Failed to fetch player details:', err);
    }
  };

  const handlePlayerExpand = async (uuid: string) => {
    if (expandedPlayer === uuid) {
      setExpandedPlayer(null);
    } else {
      setExpandedPlayer(uuid);
      if (!playerInventories[uuid] || !playerPositions[uuid]) {
        await fetchPlayerDetails(uuid);
      }
    }
  };

  const handleKickPlayer = async (uuid: string, username: string) => {
    const reason = prompt(`Enter kick reason for ${username}:`) || 'Kicked by admin';
    if (!reason) return;

    setActionLoading(`kick-${uuid}`);
    try {
      await api.kickPlayer(uuid, reason);
      await fetchPlayers(); // Refresh player list
    } catch (err) {
      setError('Failed to kick player');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendMessage = async (uuid: string, username: string) => {
    const message = prompt(`Send message to ${username}:`);
    if (!message) return;

    setActionLoading(`message-${uuid}`);
    try {
      await api.sendPlayerMessage(uuid, message);
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 10000);
    
    // Refresh on window focus
    const handleFocus = () => fetchPlayers();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const onlinePlayers = players.filter(p => p.online);
  const offlinePlayers = players.filter(p => !p.online);

  const renderInventoryGrid = (inventory: PlayerInventory['inventory']) => {
    const hotbar = inventory.filter(item => item.slot >= 0 && item.slot <= 8);
    const mainInventory = inventory.filter(item => item.slot >= 9 && item.slot <= 35);
    
    return (
      <div className="space-y-4">
        <div>
          <h5 className="text-sm font-medium text-gray-300 mb-2">Hotbar</h5>
          <div className="grid grid-cols-9 gap-1">
            {Array.from({ length: 9 }, (_, i) => {
              const item = hotbar.find(item => item.slot === i);
              return (
                <div key={i} className="w-8 h-8 bg-gray-600 border border-gray-500 rounded flex items-center justify-center text-xs">
                  {item && item.item !== 'minecraft:air' && (
                    <div className="text-center">
                      <div className="text-blue-400">{item.item.split(':')[1]?.substring(0, 3)}</div>
                      {item.count > 1 && <div className="text-gray-300">{item.count}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div>
          <h5 className="text-sm font-medium text-gray-300 mb-2">Main Inventory</h5>
          <div className="grid grid-cols-9 gap-1 max-h-32 overflow-y-auto">
            {Array.from({ length: 27 }, (_, i) => {
              const item = mainInventory.find(item => item.slot === i + 9);
              return (
                <div key={i} className="w-8 h-8 bg-gray-600 border border-gray-500 rounded flex items-center justify-center text-xs">
                  {item && item.item !== 'minecraft:air' && (
                    <div className="text-center">
                      <div className="text-blue-400">{item.item.split(':')[1]?.substring(0, 3)}</div>
                      {item.count > 1 && <div className="text-gray-300">{item.count}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Player Viewer
        </h2>
        <button
          onClick={fetchPlayers}
          disabled={loading}
          className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            Online Players ({onlinePlayers.length})
          </h3>
          <div className="space-y-3">
            {onlinePlayers.map((player) => (
              <div key={player.uuid} className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center">
                    <button
                      onClick={() => handlePlayerExpand(player.uuid)}
                      className="mr-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {expandedPlayer === player.uuid ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </button>
                    <User className="h-5 w-5 text-green-400 mr-3" />
                    <div>
                      <h4 className="text-white font-medium">{player.username}</h4>
                      <p className="text-gray-400 text-sm">
                        Playtime: {player.playtime || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-green-400">
                      <Activity className="h-4 w-4 mr-1" />
                      <span className="text-sm">Online</span>
                    </div>
                    <button
                      onClick={() => handleSendMessage(player.uuid, player.username)}
                      disabled={actionLoading === `message-${player.uuid}`}
                      className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors"
                      title="Send Message"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleKickPlayer(player.uuid, player.username)}
                      disabled={actionLoading === `kick-${player.uuid}`}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                      title="Kick Player"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {expandedPlayer === player.uuid && (
                  <div className="border-t border-gray-600 p-4 space-y-4">
                    {/* Position */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Position
                      </h5>
                      {playerPositions[player.uuid] ? (
                        <div className="text-sm text-gray-400">
                          <p>X: {playerPositions[player.uuid].position.x}</p>
                          <p>Y: {playerPositions[player.uuid].position.y}</p>
                          <p>Z: {playerPositions[player.uuid].position.z}</p>
                          <p>Dimension: {playerPositions[player.uuid].position.dimension}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Loading position...</p>
                      )}
                    </div>
                    
                    {/* Inventory */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                        <Package className="h-4 w-4 mr-1" />
                        Inventory
                      </h5>
                      {playerInventories[player.uuid] ? (
                        renderInventoryGrid(playerInventories[player.uuid].inventory)
                      ) : (
                        <p className="text-sm text-gray-500">Loading inventory...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {onlinePlayers.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                No players online
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <div className="w-3 h-3 bg-gray-500 rounded-full mr-2" />
            Recent Players ({offlinePlayers.length})
          </h3>
          <div className="space-y-3">
            {offlinePlayers.slice(0, 10).map((player) => (
              <div key={player.uuid} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <h4 className="text-white font-medium">{player.username}</h4>
                    <p className="text-gray-400 text-sm">
                      Last seen: {player.lastSeen ? new Date(player.lastSeen).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-gray-400">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">Offline</span>
                </div>
              </div>
            ))}
            {offlinePlayers.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                No recent players
              </div>
            )}
          </div>
        </div>
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
              Fabric Mod Integration
            </h3>
            <div className="mt-2 text-sm text-blue-200">
              <p>
                Enhanced player features require a custom Fabric mod. Currently showing mock data and basic functionality.
                Install the companion mod for real-time inventory, position tracking, and player management.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};