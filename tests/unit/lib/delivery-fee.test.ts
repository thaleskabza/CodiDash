import { getDeliveryTier } from "@/lib/geo";

describe("getDeliveryTier — delivery fee calculation", () => {
  it("returns R35 (3500c) for 0 km", () => {
    const result = getDeliveryTier(0);
    expect(result).toEqual({ fee: 3500, tier: "0-4km" });
  });

  it("returns R35 (3500c) for 2.5 km", () => {
    expect(getDeliveryTier(2.5)).toEqual({ fee: 3500, tier: "0-4km" });
  });

  it("returns R35 (3500c) for exactly 4 km", () => {
    expect(getDeliveryTier(4)).toEqual({ fee: 3500, tier: "0-4km" });
  });

  it("returns R45 (4500c) for 5 km", () => {
    expect(getDeliveryTier(5)).toEqual({ fee: 4500, tier: "5-10km" });
  });

  it("returns R45 (4500c) for 7.8 km", () => {
    expect(getDeliveryTier(7.8)).toEqual({ fee: 4500, tier: "5-10km" });
  });

  it("returns R45 (4500c) for exactly 10 km", () => {
    expect(getDeliveryTier(10)).toEqual({ fee: 4500, tier: "5-10km" });
  });

  it("returns null for 10.01 km (outside delivery zone)", () => {
    expect(getDeliveryTier(10.01)).toBeNull();
  });

  it("returns null for 15 km", () => {
    expect(getDeliveryTier(15)).toBeNull();
  });

  it("returns null for negative distance", () => {
    expect(getDeliveryTier(-1)).toBeNull();
  });
});
