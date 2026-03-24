"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = "",
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {props.required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={[
              "block rounded-lg border shadow-sm",
              "text-sm text-gray-900 placeholder-gray-400",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              error
                ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:border-green-500 focus:ring-green-500",
              leftIcon ? "pl-10" : "pl-3",
              rightIcon ? "pr-10" : "pr-3",
              "py-2",
              fullWidth ? "w-full" : "",
              "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1 text-sm text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
