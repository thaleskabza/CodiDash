"use client";

interface FraudAlert {
  orderId?: string;
  driverId?: string;
  orderNumber?: string;
  name?: string;
  email?: string;
  storeName?: string;
  driverName?: string;
  anomalyType: string;
  cancellationCount?: number;
  createdAt?: string;
}

interface FraudAlertsProps {
  missingReceipt: FraudAlert[];
  qrAnomalies: FraudAlert[];
  highCancellations: FraudAlert[];
}

const ANOMALY_LABELS: Record<string, { label: string; className: string }> = {
  missing_receipt: { label: "Missing Receipt", className: "bg-orange-100 text-orange-700" },
  qr_scan_failed: { label: "QR Scan Failed", className: "bg-red-100 text-red-700" },
  high_cancellations: { label: "High Cancellations", className: "bg-yellow-100 text-yellow-700" },
};

function AnomalyBadge({ type }: { type: string }) {
  const config = ANOMALY_LABELS[type] ?? { label: type, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export function FraudAlerts({ missingReceipt, qrAnomalies, highCancellations }: FraudAlertsProps) {
  const allAlerts = [
    ...missingReceipt,
    ...qrAnomalies,
    ...highCancellations,
  ];

  if (allAlerts.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400 text-sm">
        No fraud alerts. All clear.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {missingReceipt.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Missing Receipts ({missingReceipt.length})
          </h3>
          <ul className="space-y-2">
            {missingReceipt.map((alert) => (
              <li
                key={alert.orderId}
                className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    #{alert.orderNumber} — {alert.storeName}
                  </p>
                  <p className="text-xs text-gray-500">Driver: {alert.driverName}</p>
                </div>
                <AnomalyBadge type="missing_receipt" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {qrAnomalies.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            QR Scan Anomalies ({qrAnomalies.length})
          </h3>
          <ul className="space-y-2">
            {qrAnomalies.map((alert, i) => (
              <li
                key={`${alert.orderId}-${i}`}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    #{alert.orderNumber}
                  </p>
                  {alert.createdAt && (
                    <p className="text-xs text-gray-500">
                      {new Date(alert.createdAt).toLocaleDateString("en-ZA")}
                    </p>
                  )}
                </div>
                <AnomalyBadge type="qr_scan_failed" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {highCancellations.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            High Cancellation Rate ({highCancellations.length})
          </h3>
          <ul className="space-y-2">
            {highCancellations.map((alert) => (
              <li
                key={alert.driverId}
                className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{alert.name}</p>
                  <p className="text-xs text-gray-500">
                    {alert.cancellationCount} cancellations
                  </p>
                </div>
                <AnomalyBadge type="high_cancellations" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
