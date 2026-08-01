import { isSafeComment, translateComment } from "./commentModeration";

describe("comment moderation helpers", () => {
  it("blocks abusive and spam content", () => {
    expect(isSafeComment("You are stupid")).toBe(false);
    expect(isSafeComment("Click here to earn cash now")).toBe(false);
    expect(isSafeComment("!!!!!!!")).toBe(false);
  });

  it("translates comments into the requested language", () => {
    expect(translateComment("Hello", "es")).toBe("[ES] Hello");
    expect(translateComment("Hello", "en")).toBe("Hello");
  });
});
