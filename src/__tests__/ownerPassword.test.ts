import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isHashedPassword,
  needsPasswordRehash,
  verifyPassword,
} from "../utils/ownerPassword";

describe("ownerPassword", () => {
  it("hashes and verifies a password", async () => {
    const hashed = await hashPassword("секрет-123");
    expect(isHashedPassword(hashed)).toBe(true);
    expect(await verifyPassword("секрет-123", hashed)).toBe(true);
    expect(await verifyPassword("неверно", hashed)).toBe(false);
  });

  it("accepts legacy plaintext until rehash", async () => {
    expect(needsPasswordRehash("мойпароль")).toBe(true);
    expect(await verifyPassword("мойпароль", "мойпароль")).toBe(true);
    expect(await verifyPassword("другой", "мойпароль")).toBe(false);
  });
});
