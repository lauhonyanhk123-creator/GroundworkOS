export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-condensed font-bold text-yellow mb-2">No Connection</h1>
        <p className="text-muted">You&apos;re offline. Reconnect to continue using GroundworkOS.</p>
      </div>
    </div>
  );
}
