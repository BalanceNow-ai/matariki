"use client";

import { useAISStream } from "@/hooks/useAISStream";

export default function TestAISPage() {
  const apiKey = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY;
  const { position, isConnected, error } = useAISStream(apiKey);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AIS Stream Test</h1>

        {/* API Key Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">API Key:</span>
            {apiKey ? (
              <span className="text-green-400">✓ Configured ({apiKey.slice(0, 8)}...)</span>
            ) : (
              <span className="text-red-400">✗ Missing - Add NEXT_PUBLIC_AISSTREAM_API_KEY to .env.local</span>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <span>{isConnected ? "Connected to AIS Stream" : "Disconnected"}</span>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 rounded text-red-300">
              Error: {error}
            </div>
          )}
        </div>

        {/* Position Data */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Vessel Position (MMSI: 512004962)</h2>

          {position ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block text-sm">Latitude</span>
                  <span className="text-2xl font-mono">{position.lat.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-sm">Longitude</span>
                  <span className="text-2xl font-mono">{position.lng.toFixed(6)}</span>
                </div>
              </div>

              <hr className="border-gray-700 my-4" />

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400 block">Speed</span>
                  <span className="font-mono">{position.speed.toFixed(1)} kn</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Course</span>
                  <span className="font-mono">{position.course.toFixed(0)}°</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Heading</span>
                  <span className="font-mono">{position.heading}°</span>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-gray-400 block text-sm">Status</span>
                <span>{position.status}</span>
              </div>

              <div className="mt-4">
                <span className="text-gray-400 block text-sm">Last Update</span>
                <span className="font-mono text-sm">{position.timestamp}</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                  <span>Waiting for position update...</span>
                </div>
              ) : (
                <span>Connect to receive position data</span>
              )}
            </div>
          )}
        </div>

        {/* Raw JSON */}
        {position && (
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Raw Data</h2>
            <pre className="text-xs font-mono bg-black/50 p-4 rounded overflow-auto">
              {JSON.stringify(position, null, 2)}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-900/30 rounded-lg text-blue-200 text-sm">
          <p className="font-semibold mb-2">How it works:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Get a free API key from <a href="https://aisstream.io" className="underline" target="_blank">aisstream.io</a></li>
            <li>Add <code className="bg-black/30 px-1 rounded">NEXT_PUBLIC_AISSTREAM_API_KEY=your-key</code> to <code className="bg-black/30 px-1 rounded">.env.local</code></li>
            <li>Restart the dev server</li>
            <li>Position updates arrive via WebSocket when the vessel transmits AIS</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
