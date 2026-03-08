jest.mock("@semaphore-protocol/proof", () => ({
  verifyProof: jest.fn()
}));

jest.mock("../../backend/src/models/nullifier", () => ({
  markNullifierUsed: jest.fn(),
  isNullifierUsed: jest.fn(),
  isNullifierRevoked: jest.fn()
}));

const { verifyProof } = require("@semaphore-protocol/proof");
const {
  markNullifierUsed,
  isNullifierUsed,
  isNullifierRevoked
} = require("../../backend/src/models/nullifier");
const { verifyAccessProof } = require("../../backend/src/services/zkpService");
const { ACCESS_SIGNAL, EXTERNAL_NULLIFIER } = require("../../shared/constants");

const validProofShape = {
  merkleTreeRoot: "root",
  message: ACCESS_SIGNAL,
  nullifier: "n1",
  scope: EXTERNAL_NULLIFIER,
  merkleTreeDepth: 20,
  points: []
};

describe("verifyAccessProof", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isNullifierUsed.mockResolvedValue(false);
    isNullifierRevoked.mockResolvedValue(false);
  });

  it("rejects stale roots", async () => {
    await expect(
      verifyAccessProof(
        { ...validProofShape, merkleTreeRoot: "old-root" },
        "new-root"
      )
    ).rejects.toThrow("STALE_GROUP_ROOT");
  });

  it("rejects proof replay", async () => {
    isNullifierUsed.mockResolvedValue(true);
    await expect(
      verifyAccessProof(validProofShape, "root")
    ).rejects.toThrow("PROOF_REPLAY_DETECTED");
  });

  it("marks nullifier after successful verification", async () => {
    verifyProof.mockResolvedValue(true);
    const result = await verifyAccessProof(validProofShape, "root");

    expect(result.valid).toBe(true);
    expect(markNullifierUsed).toHaveBeenCalledWith("n1");
  });
});
