import { describe, it, expect } from "vitest";
import { formatCurrency, formatPrice } from "./utils";

describe("formatCurrency", () => {
  it("formats zero cents as $0.00", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats sub-dollar amounts", () => {
    expect(formatCurrency(5)).toBe("$0.05");
  });

  it("formats amounts with thousands separators", () => {
    expect(formatCurrency(123456)).toBe("$1,234.56");
  });

  it("formats large amounts", () => {
    expect(formatCurrency(99999999)).toBe("$999,999.99");
  });
});

describe("formatPrice", () => {
  it("returns Free for zero cents", () => {
    expect(formatPrice(0)).toBe("Free");
  });

  it("formats non-zero cents as a dollar amount", () => {
    expect(formatPrice(1500)).toBe("$15.00");
  });
});
