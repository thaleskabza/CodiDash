import React from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
}

const variantConfig: Record<
  AlertVariant,
  { containerClass: string; iconPath: string; iconClass: string }
> = {
  info: {
    containerClass: "bg-blue-50 border-blue-200 text-blue-800",
    iconClass: "text-blue-500",
    iconPath:
      "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  success: {
    containerClass: "bg-green-50 border-green-200 text-green-800",
    iconClass: "text-green-500",
    iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  warning: {
    containerClass: "bg-yellow-50 border-yellow-200 text-yellow-800",
    iconClass: "text-yellow-500",
    iconPath:
      "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  error: {
    containerClass: "bg-red-50 border-red-200 text-red-800",
    iconClass: "text-red-500",
    iconPath:
      "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className = "",
  onDismiss,
}: AlertProps) {
  const config = variantConfig[variant];

  return (
    <div
      role="alert"
      className={[
        "flex items-start gap-3 p-4 rounded-lg border",
        config.containerClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Icon */}
      <svg
        className={`flex-shrink-0 w-5 h-5 mt-0.5 ${config.iconClass}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={config.iconPath}
        />
      </svg>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 ml-auto -mr-1 -mt-1 p-1 rounded opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1"
          aria-label="Dismiss"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
