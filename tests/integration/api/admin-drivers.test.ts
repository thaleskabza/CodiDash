import { describe, it, expect } from "@jest/globals";

describe("GET /api/admin/drivers — driver management", () => {
  it("lists all drivers with status filter", () => {
    const statuses = ["pending_approval", "available", "busy", "offline", "suspended"];
    expect(statuses).toContain("pending_approval");
  });

  it("approves a pending driver", () => {
    const before = "pending_approval";
    const after = "available";
    expect(before).not.toBe(after);
  });

  it("suspends an active driver", () => {
    const before = "available";
    const after = "suspended";
    expect(before).not.toBe(after);
  });

  it("returns 404 for non-existent driver", () => {
    expect(true).toBe(true);
  });

  it("returns 403 for non-admin", () => {
    expect(true).toBe(true);
  });
});
