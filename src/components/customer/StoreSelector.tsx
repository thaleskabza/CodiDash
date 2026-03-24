"use client";

interface Store {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface StoreSelectorProps {
  stores: Store[];
  selectedId: string;
  onChange: (storeId: string) => void;
  disabled?: boolean;
}

export function StoreSelector({ stores, selectedId, onChange, disabled }: StoreSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Pickup Store
      </label>
      <div className="grid gap-2">
        {stores.map((store) => (
          <label
            key={store.id}
            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedId === store.id
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="storeId"
              value={store.id}
              checked={selectedId === store.id}
              onChange={() => onChange(store.id)}
              disabled={disabled}
              className="mt-0.5 accent-green-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">{store.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{store.address}</p>
            </div>
          </label>
        ))}
      </div>
      {stores.length === 0 && (
        <p className="text-sm text-gray-500">No stores available.</p>
      )}
    </div>
  );
}
