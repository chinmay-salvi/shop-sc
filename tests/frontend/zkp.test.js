const { EXTERNAL_NULLIFIER, ACCESS_SIGNAL } = require("../../shared/constants");

describe("frontend zkp shared constants", () => {
  it("uses non-empty external nullifier", () => {
    expect(EXTERNAL_NULLIFIER).toBeTruthy();
  });

  it("uses non-empty access signal", () => {
    expect(ACCESS_SIGNAL).toBeTruthy();
  });
});
