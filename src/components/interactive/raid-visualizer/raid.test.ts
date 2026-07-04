import { describe, expect, it } from "vitest";
import {
  BLOCKS_PER_DRIVE,
  DEFAULT_TEXT,
  addDrives,
  arrayStats,
  createInitialState,
  failBlock,
  failDrive,
  formatParity,
  isBlockOccupied,
  maxLogicalCapacity,
  rebuild,
  resetDriveIdCounter,
  validateDriveCount,
  writeData,
  type ArrayState,
} from "./raid";

function writeAndFail(
  level: ArrayState["level"],
  driveCount: number,
  text: string,
  fail: { driveIndex: number; blockIndex: number },
): ArrayState {
  resetDriveIdCounter();
  let state = createInitialState(level, driveCount);
  state = writeData(state, text);
  return failBlock(state, fail.driveIndex, fail.blockIndex);
}

describe("validateDriveCount", () => {
  it("requires at least two drives for RAID 0", () => {
    expect(validateDriveCount("0", 1).valid).toBe(false);
    expect(validateDriveCount("0", 2).valid).toBe(true);
  });

  it("requires an even drive count for RAID 10", () => {
    expect(validateDriveCount("10", 3).valid).toBe(false);
    expect(validateDriveCount("10", 4).valid).toBe(true);
  });
});

describe("arrayStats", () => {
  it("reports RAID 0 capacity and fault tolerance", () => {
    const stats = arrayStats("0", 2);
    expect(stats.capacityFraction).toBe(1);
    expect(stats.faultTolerance).toContain("None");
  });

  it("reports RAID 5 usable capacity", () => {
    const stats = arrayStats("5", 3);
    expect(stats.capacityFraction).toBeCloseTo(2 / 3);
    expect(stats.maxCapacity).toBe(BLOCKS_PER_DRIVE * 2);
  });
});

describe("writeData layouts", () => {
  it("stripes RAID 0 across drives", () => {
    resetDriveIdCounter();
    const state = writeData(createInitialState("0", 2), "ABCD");
    expect(state.drives[0].blocks[0].char).toBe("A");
    expect(state.drives[1].blocks[0].char).toBe("B");
    expect(state.drives[0].blocks[1].char).toBe("C");
    expect(state.drives[1].blocks[1].char).toBe("D");
  });

  it("mirrors RAID 1 on every drive", () => {
    resetDriveIdCounter();
    const state = writeData(createInitialState("1", 2), "ABC");
    for (const drive of state.drives) {
      expect(drive.blocks[0].char).toBe("A");
      expect(drive.blocks[1].char).toBe("B");
      expect(drive.blocks[2].char).toBe("C");
    }
  });

  it("stripes and mirrors RAID 10", () => {
    resetDriveIdCounter();
    const state = writeData(createInitialState("10", 4), "ABCD");
    expect(state.drives[0].blocks[0].char).toBe("A");
    expect(state.drives[2].blocks[0].char).toBe("A");
    expect(state.drives[1].blocks[0].char).toBe("B");
    expect(state.drives[3].blocks[0].char).toBe("B");
    expect(state.drives[0].blocks[1].char).toBe("C");
    expect(state.drives[2].blocks[1].char).toBe("C");
  });

  it("stores XOR parity on the dedicated RAID 4 drive", () => {
    resetDriveIdCounter();
    const state = writeData(createInitialState("4", 3), "AB");
    const parity = state.drives[2].blocks[0].parity;
    expect(parity).toBe("A".charCodeAt(0) ^ "B".charCodeAt(0));
    expect(formatParity(parity!)).toBe(
      formatParity("A".charCodeAt(0) ^ "B".charCodeAt(0)),
    );
  });

  it("writes parity for a trailing partial RAID 4 stripe", () => {
    resetDriveIdCounter();
    // 4 drives = 3 data + 1 parity; "AB" only part-fills the first stripe.
    const state = writeData(createInitialState("4", 4), "AB");
    const parityBlock = state.drives[3].blocks[0];
    expect(parityBlock.kind).toBe("parity");
    expect(parityBlock.parity).toBe("A".charCodeAt(0) ^ "B".charCodeAt(0));
  });

  it("rotates parity across drives in RAID 5", () => {
    resetDriveIdCounter();
    const state = writeData(createInitialState("5", 3), "ABCD");
    expect(state.drives[0].blocks[0].kind).toBe("parity");
    expect(state.drives[1].blocks[0].char).toBe("A");
    expect(state.drives[2].blocks[0].char).toBe("B");
    expect(state.drives[0].blocks[1].char).toBe("C");
    expect(state.drives[1].blocks[1].kind).toBe("parity");
    expect(state.drives[2].blocks[1].char).toBe("D");
  });
});

describe("rebuild", () => {
  it("cannot rebuild RAID 0", () => {
    const state = writeAndFail("0", 2, "AB", { driveIndex: 0, blockIndex: 0 });
    const result = rebuild(state);
    expect(result.success).toBe(false);
    expect(result.message).toContain("RAID 0");
  });

  it("rebuilds RAID 1 from a surviving mirror", () => {
    const state = writeAndFail("1", 2, "HELLO", { driveIndex: 0, blockIndex: 0 });
    const result = rebuild(state);
    expect(result.success).toBe(true);
    expect(result.state.drives[0].blocks[0].char).toBe("H");
    expect(result.steps[0].sources.length).toBeGreaterThan(0);
  });

  it("rebuilds RAID 4 data from parity", () => {
    resetDriveIdCounter();
    let state = writeData(createInitialState("4", 3), "AB");
    state = failBlock(state, 0, 0);
    const result = rebuild(state);
    expect(result.success).toBe(true);
    expect(result.state.drives[0].blocks[0].char).toBe("A");
  });

  it("rebuilds RAID 5 data from parity and survivors", () => {
    resetDriveIdCounter();
    let state = writeData(createInitialState("5", 3), "AB");
    state = failBlock(state, 2, 0);
    const result = rebuild(state);
    expect(result.success).toBe(true);
    expect(result.state.drives[2].blocks[0].char).toBe("B");
  });

  it("rebuilds RAID 10 from the mirror pair", () => {
    resetDriveIdCounter();
    let state = writeData(createInitialState("10", 4), "XY");
    state = failDrive(state, 0);
    const result = rebuild(state);
    expect(result.success).toBe(true);
    expect(result.state.drives[0].blocks[0].char).toBe("X");
  });

  it("rebuilds six-drive RAID 10 from the true mirror partner", () => {
    resetDriveIdCounter();
    // With 6 drives the mirror pairs are (0,3), (1,4), (2,5) — drive 1's
    // partner is drive 4, not another drive with the same index parity.
    let state = writeData(createInitialState("10", 6), "ABC");
    state = failDrive(state, 1);
    const result = rebuild(state);
    expect(result.success).toBe(true);
    expect(result.state.drives[1].blocks[0].char).toBe("B");
    expect(result.steps[0].sources).toEqual([{ driveIndex: 4, blockIndex: 0 }]);
  });

  it("recovers a partial-stripe block in RAID 4", () => {
    resetDriveIdCounter();
    let state = writeData(createInitialState("4", 4), "AB");
    state = failBlock(state, 0, 0);
    const result = rebuild(state);
    expect(result.success).toBe(true);
    expect(result.state.drives[0].blocks[0].char).toBe("A");
  });

  it("clears the drive failed flag after a successful rebuild", () => {
    resetDriveIdCounter();
    let state = writeData(createInitialState("1", 2), "HI");
    state = failDrive(state, 0);
    expect(state.drives[0].failed).toBe(true);
    const result = rebuild(state);
    expect(result.success).toBe(true);
    expect(result.state.drives[0].failed).toBe(false);
  });

  it("fails when too many RAID 4 blocks are lost", () => {
    resetDriveIdCounter();
    let state = writeData(createInitialState("4", 3), "AB");
    state = failBlock(state, 0, 0);
    state = failBlock(state, 1, 0);
    const result = rebuild(state);
    expect(result.success).toBe(false);
  });
});

describe("capacity helpers", () => {
  it("matches the default demo text length", () => {
    expect(maxLogicalCapacity("0", 2)).toBeGreaterThanOrEqual(DEFAULT_TEXT.length);
  });
});

describe("addDrives", () => {
  it("clears data because the layout geometry changed", () => {
    resetDriveIdCounter();
    let state = writeData(createInitialState("4", 3), "ABCD");
    state = addDrives(state);
    expect(state.drives).toHaveLength(4);
    expect(state.writtenLength).toBe(0);
    for (const drive of state.drives) {
      expect(drive.blocks.some(isBlockOccupied)).toBe(false);
    }
  });

  it("adds two drives at a time for RAID 10", () => {
    resetDriveIdCounter();
    const state = addDrives(createInitialState("10", 4));
    expect(state.drives).toHaveLength(6);
  });
});
