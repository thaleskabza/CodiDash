"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface AddressFormProps {
  initialLabel?: string;
  initialAddress?: string;
  initialIsDefault?: boolean;
  onSubmit: (data: {
    label?: string;
    address: string;
    isDefault: boolean;
    latitude: number;
    longitude: number;
  }) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

interface GeoResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export function AddressForm({
  initialLabel = "",
  initialAddress = "",
  initialIsDefault = false,
  onSubmit,
  onCancel,
  submitLabel = "Save Address",
}: AddressFormProps) {
  const [label, setLabel] = useState(initialLabel);
  const [address, setAddress] = useState(initialAddress);
  const [isDefault, setIsDefault] = useState(initialIsDefault);
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [geoError, setGeoError] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const debounce = useCallback(
    <T extends (...args: Parameters<T>) => void>(fn: T, delay: number) => {
      let timer: ReturnType<typeof setTimeout>;
      return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    },
    [],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geocode = useCallback(
    debounce(async (value: string) => {
      if (value.length < 5) {
        setGeoResult(null);
        return;
      }
      setIsGeocoding(true);
      setGeoError("");
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=1`;
        const res = await fetch(url, {
          headers: { "User-Agent": "CodiDash/1.0" },
        });
        const data = await res.json();
        if (data.length > 0) {
          setGeoResult({
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
            displayName: data[0].display_name,
          });
        } else {
          setGeoResult(null);
          setGeoError("Address not found. Try a more specific address.");
        }
      } catch {
        setGeoError("Could not verify address. Please try again.");
      } finally {
        setIsGeocoding(false);
      }
    }, 500),
    [],
  );

  function handleAddressChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAddress(e.target.value);
    geocode(e.target.value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!geoResult) {
      setError("Please enter a valid, geocoded address.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        label: label || undefined,
        address,
        isDefault,
        latitude: geoResult.latitude,
        longitude: geoResult.longitude,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save address.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Label (optional)"
        placeholder="e.g. Home, Work"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <div>
        <Input
          label="Delivery Address *"
          placeholder="e.g. 10 Long Street, Cape Town"
          value={address}
          onChange={handleAddressChange}
          required
        />
        {isGeocoding && (
          <p className="text-sm text-gray-500 mt-1">Verifying address…</p>
        )}
        {geoResult && !isGeocoding && (
          <p className="text-sm text-green-600 mt-1">
            ✓ {geoResult.displayName.slice(0, 80)}…
            <br />
            <span className="text-gray-400 text-xs">
              {geoResult.latitude.toFixed(5)}, {geoResult.longitude.toFixed(5)}
            </span>
          </p>
        )}
        {geoError && <p className="text-sm text-red-500 mt-1">{geoError}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded"
        />
        Set as default address
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting || !geoResult}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
