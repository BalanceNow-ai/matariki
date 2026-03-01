"use client";

import { useState } from "react";

export type Voyage = {
  _id: string;
  title: string;
  slug: { current: string };
  status: "planning" | "active" | "completed";
  startDate?: string;
  endDate?: string;
  description?: string;
};

type VoyageContextPanelProps = {
  activeVoyage: Voyage | null;
  allVoyages: Voyage[];
  onVoyageChange?: (voyageId: string | null) => void;
  distanceStats?: {
    totalNm: number;
    voyageNm: number;
  };
  dayCount?: number;
  className?: string;
};

// Calculate days since voyage start
function calculateDayCount(startDate?: string): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Format date for display
function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-NZ", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function VoyageContextPanel({
  activeVoyage,
  allVoyages,
  onVoyageChange,
  distanceStats,
  className = "",
}: VoyageContextPanelProps) {
  const [selectedVoyageId, setSelectedVoyageId] = useState<string | null>(
    activeVoyage?._id ?? null
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dayCount = activeVoyage ? calculateDayCount(activeVoyage.startDate) : 0;

  const handleVoyageSelect = (voyageId: string | null) => {
    setSelectedVoyageId(voyageId);
    setIsDropdownOpen(false);
    onVoyageChange?.(voyageId);
  };

  const selectedVoyage = allVoyages.find((v) => v._id === selectedVoyageId);

  return (
    <div
      className={`bg-deep-ocean/95 backdrop-blur-sm border border-mist/20 rounded-xl p-4 ${className}`}
    >
      {/* Voyage Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-copper-accent uppercase tracking-wider font-mono">
          Current Voyage
        </span>
        {activeVoyage?.status === "active" && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-sea-green/20 rounded-full">
            <span className="w-1.5 h-1.5 bg-sea-green rounded-full animate-pulse" />
            <span className="text-xs text-sea-green font-medium">ACTIVE</span>
          </span>
        )}
      </div>

      {/* Voyage Title & Selector */}
      <div className="relative mb-4">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between p-2 bg-midnight-blue/50 rounded-lg border border-mist/10 hover:border-mist/20 transition-colors"
        >
          <span className="text-lg font-display text-salt-white truncate">
            {selectedVoyage?.title || activeVoyage?.title || "No active voyage"}
          </span>
          <svg
            className={`w-4 h-4 text-mist/60 transition-transform ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Dropdown */}
        {isDropdownOpen && allVoyages.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-midnight-blue border border-mist/20 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
            <button
              onClick={() => handleVoyageSelect(null)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-water/50 transition-colors ${
                !selectedVoyageId ? "text-copper-accent" : "text-salt-white"
              }`}
            >
              All Voyages
            </button>
            {allVoyages.map((voyage) => (
              <button
                key={voyage._id}
                onClick={() => handleVoyageSelect(voyage._id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-water/50 transition-colors flex items-center justify-between ${
                  selectedVoyageId === voyage._id
                    ? "text-copper-accent"
                    : "text-salt-white"
                }`}
              >
                <span className="truncate">{voyage.title}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    voyage.status === "active"
                      ? "bg-sea-green/20 text-sea-green"
                      : voyage.status === "completed"
                      ? "bg-mist/20 text-mist"
                      : "bg-copper-accent/20 text-copper-accent"
                  }`}
                >
                  {voyage.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voyage Stats */}
      {activeVoyage && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-salt-white">
              {dayCount}
            </div>
            <div className="text-xs text-mist/60 uppercase tracking-wider">
              Days
            </div>
          </div>
          <div className="text-center border-x border-mist/10">
            <div className="text-2xl font-mono font-bold text-salt-white">
              {distanceStats?.voyageNm?.toFixed(0) ?? "--"}
            </div>
            <div className="text-xs text-mist/60 uppercase tracking-wider">
              NM
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-salt-white">
              {distanceStats?.totalNm?.toFixed(0) ?? "--"}
            </div>
            <div className="text-xs text-mist/60 uppercase tracking-wider">
              Total NM
            </div>
          </div>
        </div>
      )}

      {/* Date Range */}
      {activeVoyage && (
        <div className="flex items-center justify-between text-xs text-mist/60 border-t border-mist/10 pt-3">
          <span>Started {formatDate(activeVoyage.startDate)}</span>
          {activeVoyage.endDate && (
            <span>Ends {formatDate(activeVoyage.endDate)}</span>
          )}
        </div>
      )}
    </div>
  );
}
