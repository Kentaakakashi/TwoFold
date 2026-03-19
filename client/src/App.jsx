import { useState, useCallback, useEffect } from "react";
import useProximityChat from "./hooks/useProximityChat";
import PhaserGame from "./game/PhaserGame";
import LoginScreen from "./components/LoginScreen";
import VideoOverlay from "./components/VideoOverlay";
import HUD from "./components/HUD";
import BuilderPanel from "./components/BuilderPanel";

export default function App() {
  const [joined, setJoined] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState({});
  const [myId, setMyId] = useState(null);
  const [connected, setConnected] = useState(false);

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [removeMode, setRemoveMode] = useState(false);
  const [zoom, setZoom] = useState(1);

  const proximityRadius = 4;

  const {
    activePeers, remoteStreams, localStream,
    conversations, myConvId, nearbyConversations,
    pendingRequests, requestStatus,
    requestJoin, respondToRequest, leaveConversation,
  } = useProximityChat(players, myId, proximityRadius);

  // Sync state to global bridge for Phaser
  useEffect(() => {
    if (window.__GATHER__) {
      window.__GATHER__.conversations = conversations;
      window.__GATHER__.builderSelectedItem = selectedItem;
      window.__GATHER__.builderRemoveMode = removeMode;
      window.__GATHER__.onZoomChange = setZoom;
    }
  }, [conversations, selectedItem, removeMode]);

  const handlePlayersUpdate = useCallback((newPlayers, newMyId) => {
    setPlayers(newPlayers);
    if (newMyId) setMyId(newMyId);
  }, []);

  const handleConnectionUpdate = useCallback((isConnected) => {
    setConnected(isConnected);
  }, []);

  const handleJoin = useCallback((name) => {
    setPlayerName(name);
    setJoined(true);
  }, []);

  const handleSelectItem = useCallback((type) => {
    setSelectedItem(type);
    setRemoveMode(false);
  }, []);

  const handleRemoveMode = useCallback(() => {
    setRemoveMode((prev) => !prev);
    setSelectedItem(null);
  }, []);

  const handleToggleBuilder = useCallback(() => {
    setBuilderOpen((prev) => !prev);
    if (builderOpen) {
      setSelectedItem(null);
      setRemoveMode(false);
    }
  }, [builderOpen]);

  if (!joined) return <LoginScreen onJoin={handleJoin} />;

  return (
    <>
      <PhaserGame
        playerName={playerName}
        onPlayersUpdate={handlePlayersUpdate}
        onConnectionUpdate={handleConnectionUpdate}
      />
      <HUD
        players={players}
        myId={myId}
        connected={connected}
        myConvId={myConvId}
        nearbyConversations={nearbyConversations}
        pendingRequests={pendingRequests}
        requestStatus={requestStatus}
        conversations={conversations}
        onRequestJoin={requestJoin}
        onRespondToRequest={respondToRequest}
        onLeaveConversation={leaveConversation}
      />
      <BuilderPanel
        open={builderOpen}
        onToggle={handleToggleBuilder}
        selectedItem={selectedItem}
        onSelectItem={handleSelectItem}
        onRemoveMode={handleRemoveMode}
        removeMode={removeMode}
      />
      <VideoOverlay
        remoteStreams={remoteStreams}
        localStream={localStream}
        players={players}
        activePeers={activePeers}
      />
      {zoom !== 1 && (
        <div style={{
          position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
          zIndex: 50, background: "rgba(20,25,35,0.8)",
          border: "1px solid rgba(100,150,200,0.3)", borderRadius: 4,
          padding: "3px 10px", fontSize: 11, color: "#8898AA",
          fontFamily: "'Segoe UI', system-ui, sans-serif", pointerEvents: "none",
        }}>
          {Math.round(zoom * 100)}%
        </div>
      )}
    </>
  );
}
