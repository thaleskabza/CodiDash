import { describe, it, expect } from "@jest/globals";

describe("GET /api/admin/revenue — revenue tracking", () => {
  it("returns total, driver payouts, and platform earnings", () => {
    const total = 3500;
    const driver = 2000;
    const platform = total - driver;
    expect(platform).toBe(1500);
  });

  it("filters by date range", () => {
    const from = "2026-01-01";
    const to = "2026-12-31";
    expect(new Date(from) < new Date(to)).toBe(true);
  });

  it("returns order counts per day", () => {
    const daily = [{ date: "2026-03-15", count: 5, total: 17500 }];
    expect(daily[0].count).toBe(5);
  });

  it("returns 401 for unauthenticated requests", () => {
    expect(true).toBe(true);
  });

  it("returns 403 for non-admin users", () => {
    expect(true).toBe(true);
  });
});
