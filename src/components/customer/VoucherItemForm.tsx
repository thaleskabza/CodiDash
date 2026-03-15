"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export interface VoucherItem {
  id: string;
  voucherCode: string;
  voucherImageUrl: string | null;
  voucherInputMode: "code" | "image";
  smoothieItem: string;
  imageUploading?: boolean;
  imageError?: string;
}

interface VoucherItemFormProps {
  items: VoucherItem[];
  menuItems: { name: string; category?: string | null }[];
  onChange: (items: VoucherItem[]) => void;
  disabled?: boolean;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function VoucherItemForm({
  items,
  menuItems,
  onChange,
  disabled,
}: VoucherItemFormProps) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function addItem() {
    onChange([
      ...items,
      {
        id: generateId(),
        voucherCode: "",
        voucherImageUrl: null,
        voucherInputMode: "code",
        smoothieItem: "",
      },
    ]);
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function updateItem(id: string, patch: Partial<VoucherItem>) {
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function handleImageUpload(id: string, file: File) {
    updateItem(id, { imageUploading: true, imageError: undefined });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      updateItem(id, { voucherImageUrl: url, imageUploading: false });
    } catch {
      updateItem(id, {
        imageUploading: false,
        imageError: "Upload failed. Please try again.",
      });
    }
  }

  const isValid =
    items.length > 0 &&
    items.every(
      (i) =>
        (i.voucherInputMode === "code" ? i.voucherCode.trim() : i.voucherImageUrl) &&
        i.smoothieItem,
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          Vouchers & Items
          <span className="ml-2 text-sm text-gray-400 font-normal">
            ({items.length} item{items.length !== 1 ? "s" : ""})
          </span>
        </h3>
        <Button type="button" size="sm" onClick={addItem} disabled={disabled}>
          + Add Voucher
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-500">
          Add at least one voucher to place an order.
        </p>
      )}

      {items.map((item, index) => (
        <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              Item {index + 1}
            </span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={disabled}
                className="text-red-400 hover:text-red-600 text-sm"
              >
                Remove
              </button>
            )}
          </div>

          {/* Voucher input mode toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateItem(item.id, { voucherInputMode: "code" })}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                item.voucherInputMode === "code"
                  ? "bg-green-600 text-white border-green-600"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              Enter Code
            </button>
            <button
              type="button"
              onClick={() => updateItem(item.id, { voucherInputMode: "image" })}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                item.voucherInputMode === "image"
                  ? "bg-green-600 text-white border-green-600"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              Upload Image
            </button>
          </div>

          {item.voucherInputMode === "code" ? (
            <Input
              label="Voucher Number"
              value={item.voucherCode}
              onChange={(e) => updateItem(item.id, { voucherCode: e.target.value })}
              placeholder="e.g. 839203923"
              disabled={disabled}
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voucher Image
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={(el) => { fileRefs.current[item.id] = el; }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(item.id, file);
                }}
                disabled={disabled || item.imageUploading}
                className="text-sm"
              />
              {item.imageUploading && (
                <p className="text-xs text-gray-500 mt-1">Uploading…</p>
              )}
              {item.voucherImageUrl && !item.imageUploading && (
                <p className="text-xs text-green-600 mt-1">✓ Image uploaded</p>
              )}
              {item.imageError && (
                <p className="text-xs text-red-500 mt-1">{item.imageError}</p>
              )}
            </div>
          )}

          {/* Smoothie item selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Smoothie Item
            </label>
            <select
              value={item.smoothieItem}
              onChange={(e) => updateItem(item.id, { smoothieItem: e.target.value })}
              disabled={disabled}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a smoothie…</option>
              {menuItems.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      {/* 1:1 validation warning */}
      {items.length > 0 && !isValid && (
        <Alert variant="warning">
          Each voucher must be paired with a smoothie item. All fields are required.
        </Alert>
      )}
    </div>
  );
}
