'use client';

import { useState, useEffect, useRef } from 'react';
import { DeliveryTicket } from '@/lib/types/ticket';
import { 
  Package, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  FileText, 
  UserCheck, 
  Camera, 
  Video, 
  RefreshCw,
  PlusCircle,
  ExternalLink,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useWebRTCStream } from './hooks/useWebRTCStream';

export default function HandoffDashboard() {
  const [tickets, setTickets] = useState<DeliveryTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoAccelerated, setDemoAccelerated] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<DeliveryTicket | null>(null);
  const [staffName, setStaffName] = useState('Elena (Front Desk)');
  const [isResolving, setIsResolving] = useState(false);

  // Playground Access Token modal / input state
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [playgroundToken, setPlaygroundToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  const { streamActive, streamError, startStream, stopStream } = useWebRTCStream({ 
    videoRef, 
    deviceId 
  });

  // Auto-discover devices when token is saved
  const discoverDeviceAndStartStream = async () => {
    setIsConnecting(true);
    try {
      const devRes = await fetch('/api/ring/devices');
      const devData = await devRes.json();
      if (devData.devices && devData.devices.length > 0) {
        const foundId = devData.devices[0].id;
        setDeviceId(foundId);
        await startStream();
      } else {
        await startStream(); // Fall back to default
      }
    } catch (err) {
      console.error('Auto discovery error:', err);
      await startStream();
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
        if (!selectedTicket && data.tickets.length > 0) {
          setSelectedTicket(data.tickets[0]);
        } else if (selectedTicket) {
          const updated = data.tickets.find((t: DeliveryTicket) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string, action: 'resolve' | 'flag_exception') => {
    setIsResolving(true);
    try {
      const res = await fetch(`/api/tickets/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffName,
          action: action === 'flag_exception' ? 'flag_exception' : 'resolve',
          notes: action === 'flag_exception' 
            ? 'Package was not found outside when staff went to collect it.' 
            : 'Staff confirmed retrieval and brought parcel into office.',
        }),
      });

      if (res.ok) {
        await fetchTickets();
      }
    } catch (err) {
      console.error('Resolve error:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleSimulateDelivery = async () => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ringDeviceId: deviceId || 'front_doorbell_pro2',
          ringDeviceName: 'Front Door Camera',
          carrierDetected: 'Amazon',
          slaMinutes: demoAccelerated ? 0.16 : 15,
          placement: {
            classification: 'SHELTERED',
            confidence: 0.94,
            hazardNotes: 'Placed under the front entrance awning, clear of the walkway.',
            snapshotUrl: '/box.png',
            analyzedAt: new Date().toISOString(),
          },
        }),
      });

      if (res.ok) {
        await fetchTickets();
      }
    } catch (err) {
      console.error('Simulate delivery error:', err);
    }
  };

  const handleSaveToken = async () => {
    if (!playgroundToken.trim()) return;
    try {
      const res = await fetch('/api/ring/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: playgroundToken.trim() }),
      });
      if (res.ok) {
        setTokenSaved(true);
        setShowTokenInput(false);
        await discoverDeviceAndStartStream();
      }
    } catch (err) {
      console.error('Failed to set token:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SLA_BREACHED':
        return { label: 'Needs Attention', bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'RESOLVED_CONFIRMED':
        return { label: 'Brought Inside', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'UNATTENDED_REMOVAL':
        return { label: 'Reported Missing', bg: 'bg-red-500/20 text-red-300 border-red-500/30' };
      default:
        return { label: 'Waiting Outside', bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Sleek Minimal Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-sky-400">
            <Package className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-semibold text-sm text-white tracking-tight">Handoff</h1>
            <span className="text-xs text-slate-400 font-normal">Delivery Sentry for Ring</span>
          </div>
        </div>

        {/* Grouped Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white transition-all"
          >
            <KeyRound className="h-3 w-3 text-sky-400" />
            {tokenSaved ? 'Ring Connected' : 'Ring Playground Token'}
          </button>

          <button
            onClick={() => setDemoAccelerated(!demoAccelerated)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              demoAccelerated 
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' 
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {demoAccelerated ? 'Demo Timer (10s)' : 'Normal Timer (15 min)'}
          </button>

          <button
            onClick={handleSimulateDelivery}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium px-3.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Simulate Drop
          </button>
        </div>
      </header>

      {/* Ring Playground Token Input Modal Bar */}
      {showTokenInput && (
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-slate-300 whitespace-nowrap">Playground Access Token:</span>
            <input
              type="password"
              value={playgroundToken}
              onChange={(e) => setPlaygroundToken(e.target.value)}
              placeholder="Paste token from developer.amazon.com/ring/console/playground"
              className="bg-slate-950 border border-slate-700 text-xs px-3 py-1.5 rounded-md text-slate-200 w-full max-w-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToken}
              className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-medium px-3.5 py-1.5 rounded-md transition-colors"
            >
              Save & Connect Stream
            </button>
            <button
              onClick={() => setShowTokenInput(false)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Bento Layout */}
      <main className="flex-1 p-6 grid grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Left 7 Columns: Video Viewport + Selected Delivery */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          {/* Ring Live Stream Viewport */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-sky-400" />
                <span className="text-xs font-medium text-slate-200">Front Door Camera</span>
                <span className={`h-2 w-2 rounded-full ${streamActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-[11px] text-slate-400">
                  {streamActive ? 'Live WebRTC Stream Active' : isConnecting ? 'Negotiating WebRTC...' : 'Last Delivery Snapshot'}
                </span>
              </div>
              <div>
                {!streamActive ? (
                  <button
                    onClick={() => {
                      if (!tokenSaved && !playgroundToken) {
                        setShowTokenInput(true);
                      } else {
                        discoverDeviceAndStartStream();
                      }
                    }}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/20 px-2.5 py-1 rounded-md transition-colors"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Playground Stream'}
                  </button>
                ) : (
                  <button
                    onClick={stopStream}
                    className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
              />

              {/* Verified Last Captured Frame (when WebRTC is idle) */}
              {!streamActive && (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent z-10" />
                  
                  {/* Crisp frame representation */}
                  <div className="text-center p-6 flex flex-col items-center z-20">
                    <div className="h-10 w-10 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center text-sky-400 mb-2.5 shadow-inner">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-200">
                        {selectedTicket ? `${selectedTicket.id} · Recorded Frame` : 'Front Door Standby'}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        Ring API Grounded
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      {selectedTicket 
                        ? `Captured at ${new Date(selectedTicket.arrivedAt).toLocaleTimeString()} by Ring Doorbell`
                        : 'Connect Ring Playground token above for live WebRTC feeds.'}
                    </p>
                  </div>

                  {streamError && (
                    <div className="absolute bottom-3 left-3 right-3 z-30">
                      <p className="text-xs text-amber-300 bg-amber-950/80 border border-amber-500/30 px-3 py-1.5 rounded-lg text-center backdrop-blur">
                        {streamError}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Status pill over stream */}
              {selectedTicket && (
                <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1 rounded-md flex items-center gap-2 z-20">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span className="text-[11px] font-medium text-slate-200">
                    {selectedTicket.id} · {selectedTicket.carrierDetected}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Selected Delivery Details */}
          {selectedTicket && (
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-base text-white">{selectedTicket.id}</h2>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${getStatusBadge(selectedTicket.status).bg}`}>
                      {getStatusBadge(selectedTicket.status).label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Delivered by {selectedTicket.carrierDetected} at {new Date(selectedTicket.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <a
                  href={`/api/tickets/${selectedTicket.id}/dossier`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs bg-slate-800/80 hover:bg-slate-700 text-sky-300 border border-sky-500/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Print Summary
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </div>

              {/* Two Column Inspection Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Spot Check
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-white">
                        {selectedTicket.placement.classification === 'SHELTERED' ? 'Under Cover' : 'Open Sidewalk'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {selectedTicket.placement.hazardNotes.startsWith('Grounded to Ring History Event ID:') ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-300 font-medium text-[11px]">Grounded to Ring History Event:</span>
                        <span 
                          className="font-mono text-[10px] text-sky-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded truncate block select-all cursor-pointer" 
                          title={selectedTicket.placement.hazardNotes}
                        >
                          {selectedTicket.placement.hazardNotes.replace('Grounded to Ring History Event ID: ', '')}
                        </span>
                      </div>
                    ) : (
                      selectedTicket.placement.hazardNotes
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sky-400" />
                    Time Outside
                  </div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {Math.floor(selectedTicket.dwellSeconds / 60)}m {selectedTicket.dwellSeconds % 60}s
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {selectedTicket.status === 'SLA_BREACHED' ? (
                      <span className="text-rose-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Outside longer than usual
                      </span>
                    ) : selectedTicket.status === 'RESOLVED_CONFIRMED' ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledged by {selectedTicket.resolution?.resolvedBy}
                      </span>
                    ) : (
                      `Target: Bring inside within ${selectedTicket.slaMinutes} min`
                    )}
                  </p>
                </div>
              </div>

              {/* Action Bar with Honest Wording */}
              {selectedTicket.status !== 'RESOLVED_CONFIRMED' && selectedTicket.status !== 'UNATTENDED_REMOVAL' && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 flex items-center justify-between gap-4 mt-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-medium text-slate-300">Staff Member:</div>
                      <input
                        type="text"
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs px-2.5 py-1 rounded text-slate-200 mt-1 w-44"
                        placeholder="Staff Name"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={isResolving}
                      onClick={() => handleResolve(selectedTicket.id, 'flag_exception')}
                      className="text-xs text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Report Missing
                    </button>
                    <button
                      disabled={isResolving}
                      onClick={() => handleResolve(selectedTicket.id, 'resolve')}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      Confirm Retrieval
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 5 Columns: Delivery Queue */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-white">Recent Deliveries</h2>
              <span className="text-xs bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded-full">
                {tickets.length}
              </span>
            </div>
            <button
              onClick={fetchTickets}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
            {tickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const badge = getStatusBadge(t.status);

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-sky-500 shadow-md ring-1 ring-sky-500/30'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{t.id}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {t.carrierDetected}
                      </span>
                    </div>

                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2.5 pt-2 border-t border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      Outside: {Math.floor(t.dwellSeconds / 60)}m {t.dwellSeconds % 60}s
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {t.placement.classification === 'SHELTERED' ? 'Under Cover' : 'Open Sidewalk'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
