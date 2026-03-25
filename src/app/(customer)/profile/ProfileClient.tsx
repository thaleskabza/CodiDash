"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AddressForm } from "@/components/customer/AddressForm";

interface Address {
  id: string;
  label?: string;
  address: string;
  isDefault: boolean;
  latitude: number;
  longitude: number;
}

interface ProfileClientProps {
  user: { name: string; email: string };
  initialAddresses: Address[];
}

export function ProfileClient({ user, initialAddresses }: ProfileClientProps) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function handleAddAddress(data: {
    label?: string;
    address: string;
    isDefault: boolean;
  }) {
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add address");
    }

    const { address: newAddr } = await res.json();
    setAddresses((prev) => {
      const updated = data.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev;
      return [newAddr, ...updated];
    });
    setShowAddForm(false);
    setMessage("Address added successfully.");
  }

  async function handleSetDefault(id: string) {
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });

    if (res.ok) {
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id })),
      );
      setMessage("Default address updated.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      setMessage("Address deleted.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {message && (
        <Alert variant="success" onDismiss={() => setMessage("")}>
          {message}
        </Alert>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3">Account Details</h2>
        <p className="text-gray-700">
          <span className="font-medium">Name:</span> {user.name}
        </p>
        <p className="text-gray-700 mt-1">
          <span className="font-medium">Email:</span> {user.email}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={async () => { await signOut({ redirect: false }); window.location.href = "/"; }}
        >
          Sign Out
        </Button>
      </Card>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Delivery Addresses</h2>
          <Button
            size="sm"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingId(null);
            }}
          >
            {showAddForm ? "Cancel" : "+ Add Address"}
          </Button>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-medium mb-3">New Address</h3>
            <AddressForm
              onSubmit={handleAddAddress}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {addresses.length === 0 ? (
          <p className="text-gray-500 text-sm">No saved addresses yet.</p>
        ) : (
          <ul className="space-y-3">
            {addresses.map((addr) => (
              <li
                key={addr.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div>
                  {addr.label && (
                    <span className="text-sm font-medium text-green-700 mr-2">
                      {addr.label}
                    </span>
                  )}
                  {addr.isDefault && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mr-2">
                      Default
                    </span>
                  )}
                  <p className="text-sm text-gray-700 mt-0.5">{addr.address}</p>
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  {!addr.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(addr.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(addr.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
