import React from "react";

type LoadingSize = "sm" | "md" | "lg" | "xl";

interface LoadingSpinnerProps {
  size?: LoadingSize;
  label?: string;
  className?: string;
  color?: string;
}

interface LoadingOverlayProps {
  message?: string;
}

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

const sizeConfig: Record<LoadingSize, { spinner: string; text: string }> = {
  sm: { spinner: "w-4 h-4", text: "text-xs" },
  md: { spinner: "w-8 h-8", text: "text-sm" },
  lg: { spinner: "w-12 h-12", text: "text-base" },
  xl: { spinner: "w-16 h-16", text: "text-lg" },
};

export function LoadingSpinner({
  size = "md",
  label,
  className = "",
  color = "text-green-600",
}: LoadingSpinnerProps) {
  const config = sizeConfig[size];

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <svg
        className={`animate-spin ${config.spinner} ${color}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label && (
        <span className={`${config.text} text-gray-600`}>{label}</span>
      )}
      <span className="sr-only">{label ?? "Loading..."}</span>
    </div>
  );
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-label={message}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white shadow-xl border border-gray-100">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

export function LoadingSkeleton({ lines = 3, className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function LoadingCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse p-4 bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <LoadingSkeleton lines={3} />
    </div>
  );
}
