export const BLOCKS_PER_DRIVE = 16;
export const DEFAULT_TEXT = "ABCDEFGHIJKLMNOP";

export type RaidLevel = "0" | "1" | "4" | "5" | "10";

export type BlockKind = "data" | "parity" | "empty";

export type Block = {
  kind: BlockKind;
  char?: string;
  parity?: number;
  failed: boolean;
};

export type Drive = {
  id: string;
  blocks: Block[];
  failed: boolean;
};

export type ArrayState = {
  level: RaidLevel;
  drives: Drive[];
  writtenLength: number;
};

export type BlockRef = {
  driveIndex: number;
  blockIndex: number;
};

export type RecoveryStep = {
  target: BlockRef;
  value: string;
  sources: BlockRef[];
  recovered: boolean;
  reason?: string;
};

export type RebuildResult = {
  state: ArrayState;
  steps: RecoveryStep[];
  message: string;
  success: boolean;
};

export type ArrayStats = {
  capacityFraction: number;
  capacityLabel: string;
  faultTolerance: string;
  readWrite: string;
  minDrives: number;
  maxCapacity: number;
};

export type DriveCountValidation = {
  valid: boolean;
  message: string;
  min: number;
};

let nextDriveId = 0;

export function createDriveId(): string {
  nextDriveId += 1;
  return `drive-${nextDriveId}`;
}

export function resetDriveIdCounter(): void {
  nextDriveId = 0;
}

export function emptyBlock(): Block {
  return { kind: "empty", failed: false };
}

export function createDrive(): Drive {
  return {
    id: createDriveId(),
    blocks: Array.from({ length: BLOCKS_PER_DRIVE }, emptyBlock),
    failed: false,
  };
}

export function defaultDriveCount(level: RaidLevel): number {
  switch (level) {
    case "0":
    case "1":
      return 2;
    case "4":
    case "5":
      return 3;
    case "10":
      return 4;
  }
}

export function drivesToAdd(level: RaidLevel): number {
  return level === "10" ? 2 : 1;
}

export function validateDriveCount(
  level: RaidLevel,
  count: number,
): DriveCountValidation {
  const min = defaultDriveCount(level);
  if (count < min) {
    return {
      valid: false,
      min,
      message: `RAID ${level} needs at least ${min} drives.`,
    };
  }
  if (level === "10" && count % 2 !== 0) {
    return {
      valid: false,
      min,
      message: "RAID 10 requires an even number of drives.",
    };
  }
  return { valid: true, min, message: "" };
}

export function maxLogicalCapacity(
  level: RaidLevel,
  driveCount: number,
): number {
  const validation = validateDriveCount(level, driveCount);
  if (!validation.valid) return 0;

  const rows = BLOCKS_PER_DRIVE;
  switch (level) {
    case "0":
      return rows * driveCount;
    case "1":
      return rows;
    case "4":
    case "5":
      return rows * (driveCount - 1);
    case "10":
      return rows * (driveCount / 2);
  }
}

export function arrayStats(level: RaidLevel, driveCount: number): ArrayStats {
  const validation = validateDriveCount(level, driveCount);
  const maxCapacity = maxLogicalCapacity(level, driveCount);

  if (!validation.valid) {
    return {
      capacityFraction: 0,
      capacityLabel: "Invalid configuration",
      faultTolerance: "—",
      readWrite: "—",
      minDrives: validation.min,
      maxCapacity: 0,
    };
  }

  switch (level) {
    case "0":
      return {
        capacityFraction: 1,
        capacityLabel: "100% usable",
        faultTolerance: "None. Any drive loss is fatal.",
        readWrite: "Fast reads and writes. No redundancy.",
        minDrives: 2,
        maxCapacity,
      };
    case "1":
      return {
        capacityFraction: 1 / driveCount,
        capacityLabel: `${Math.round((100 / driveCount) * 10) / 10}% usable`,
        faultTolerance: `Up to ${driveCount - 1} drive failures`,
        readWrite: "Fast reads. Writes copy to every drive.",
        minDrives: 2,
        maxCapacity,
      };
    case "4":
      return {
        capacityFraction: (driveCount - 1) / driveCount,
        capacityLabel: `${Math.round(((driveCount - 1) / driveCount) * 100)}% usable`,
        faultTolerance: "1 drive failure",
        readWrite: "Dedicated parity drive. Writes hit a parity bottleneck.",
        minDrives: 3,
        maxCapacity,
      };
    case "5":
      return {
        capacityFraction: (driveCount - 1) / driveCount,
        capacityLabel: `${Math.round(((driveCount - 1) / driveCount) * 100)}% usable`,
        faultTolerance: "1 drive failure",
        readWrite: "Distributed parity. Better write scaling than RAID 4.",
        minDrives: 3,
        maxCapacity,
      };
    case "10":
      return {
        capacityFraction: 0.5,
        capacityLabel: "50% usable",
        faultTolerance: "1 failure per mirror pair",
        readWrite: "Striped mirrors. Speed plus redundancy.",
        minDrives: 4,
        maxCapacity,
      };
  }
}

export function createInitialState(
  level: RaidLevel,
  driveCount = defaultDriveCount(level),
): ArrayState {
  resetDriveIdCounter();
  const validation = validateDriveCount(level, driveCount);
  const count = validation.valid ? driveCount : defaultDriveCount(level);
  return {
    level,
    drives: Array.from({ length: count }, () => createDrive()),
    writtenLength: 0,
  };
}

function xorCharCodes(chars: string[]): number {
  return chars.reduce((acc, ch) => acc ^ ch.charCodeAt(0), 0);
}

function setDataBlock(drive: Drive, blockIndex: number, char: string): void {
  if (blockIndex >= BLOCKS_PER_DRIVE) return;
  drive.blocks[blockIndex] = { kind: "data", char, failed: false };
}

function setParityBlock(
  drive: Drive,
  blockIndex: number,
  parity: number,
): void {
  if (blockIndex >= BLOCKS_PER_DRIVE) return;
  drive.blocks[blockIndex] = {
    kind: "parity",
    parity,
    failed: false,
  };
}

function clearDriveBlocks(drive: Drive): void {
  drive.blocks = Array.from({ length: BLOCKS_PER_DRIVE }, emptyBlock);
}

export function formatParity(parity: number): string {
  return parity.toString(16).toUpperCase().padStart(2, "0");
}

export function blockDisplay(block: Block): string {
  if (block.kind === "empty") return "";
  if (block.kind === "parity" && block.parity !== undefined) {
    return formatParity(block.parity);
  }
  return block.char ?? "";
}

export function isBlockOccupied(block: Block): boolean {
  return block.kind !== "empty";
}

function layoutRaid0(data: string, drives: Drive[]): number {
  const n = drives.length;
  let written = 0;
  for (let i = 0; i < data.length; i++) {
    const driveIndex = i % n;
    const blockIndex = Math.floor(i / n);
    if (blockIndex >= BLOCKS_PER_DRIVE) break;
    setDataBlock(drives[driveIndex], blockIndex, data[i]);
    written++;
  }
  return written;
}

function layoutRaid1(data: string, drives: Drive[]): number {
  const limit = Math.min(data.length, BLOCKS_PER_DRIVE);
  for (let blockIndex = 0; blockIndex < limit; blockIndex++) {
    for (const drive of drives) {
      setDataBlock(drive, blockIndex, data[blockIndex]);
    }
  }
  return limit;
}

function layoutRaid10(data: string, drives: Drive[]): number {
  const n = drives.length;
  const half = n / 2;
  let written = 0;
  let stripeDrive = 0;
  for (let i = 0; i < data.length; i++) {
    const blockIndex = Math.floor(i / half);
    if (blockIndex >= BLOCKS_PER_DRIVE) break;
    const char = data[i];
    setDataBlock(drives[stripeDrive], blockIndex, char);
    setDataBlock(drives[stripeDrive + half], blockIndex, char);
    written++;
    stripeDrive = (stripeDrive + 1) % half;
  }
  return written;
}

function layoutRaid4(data: string, drives: Drive[]): number {
  const n = drives.length;
  const dataDrives = n - 1;
  let written = 0;
  let stripeDrive = 0;
  let stripeRow = 0;
  const rowChars: string[] = [];

  for (const char of data) {
    setDataBlock(drives[stripeDrive], stripeRow, char);
    rowChars.push(char);
    written++;
    stripeDrive++;

    if (stripeDrive === dataDrives) {
      const parity = xorCharCodes(rowChars);
      setParityBlock(drives[n - 1], stripeRow, parity);
      rowChars.length = 0;
      stripeRow++;
      stripeDrive = 0;
      if (stripeRow >= BLOCKS_PER_DRIVE) break;
    }
  }

  // A trailing partial stripe still gets parity so its blocks are protected,
  // matching how RAID 5's per-row loop already behaves.
  if (rowChars.length > 0 && stripeRow < BLOCKS_PER_DRIVE) {
    setParityBlock(drives[n - 1], stripeRow, xorCharCodes(rowChars));
  }

  return written;
}

function layoutRaid5(data: string, drives: Drive[]): number {
  const n = drives.length;
  let written = 0;
  let stripeRow = 0;

  for (let i = 0; i < data.length; ) {
    if (stripeRow >= BLOCKS_PER_DRIVE) break;
    const parityDrive = stripeRow % n;
    const rowChars: { driveIndex: number; char: string }[] = [];

    for (let d = 0; d < n && i < data.length; d++) {
      if (d === parityDrive) continue;
      rowChars.push({ driveIndex: d, char: data[i] });
      i++;
      written++;
    }

    const parity = xorCharCodes(rowChars.map((entry) => entry.char));
    for (const entry of rowChars) {
      setDataBlock(drives[entry.driveIndex], stripeRow, entry.char);
    }
    setParityBlock(drives[parityDrive], stripeRow, parity);
    stripeRow++;
  }

  return written;
}

export function writeData(state: ArrayState, text: string): ArrayState {
  const normalized = text.replaceAll(" ", "_");
  const drives = state.drives.map((drive) => {
    const next = { ...drive, failed: false };
    clearDriveBlocks(next);
    return next;
  });

  let writtenLength = 0;
  switch (state.level) {
    case "0":
      writtenLength = layoutRaid0(normalized, drives);
      break;
    case "1":
      writtenLength = layoutRaid1(normalized, drives);
      break;
    case "4":
      writtenLength = layoutRaid4(normalized, drives);
      break;
    case "5":
      writtenLength = layoutRaid5(normalized, drives);
      break;
    case "10":
      writtenLength = layoutRaid10(normalized, drives);
      break;
  }

  return { ...state, drives, writtenLength };
}

export function setDriveCount(
  state: ArrayState,
  driveCount: number,
): ArrayState {
  const validation = validateDriveCount(state.level, driveCount);
  if (!validation.valid) return state;

  resetDriveIdCounter();
  return {
    ...state,
    drives: Array.from({ length: driveCount }, () => createDrive()),
    writtenLength: 0,
  };
}

export function addDrives(state: ArrayState): ArrayState {
  const count = drivesToAdd(state.level);
  const validation = validateDriveCount(
    state.level,
    state.drives.length + count,
  );
  if (!validation.valid) return state;

  // Changing the geometry invalidates the current layout (stripe width and
  // parity placement both depend on drive count), so clear all data.
  const drives = state.drives.map((drive) => ({
    ...drive,
    failed: false,
    blocks: Array.from({ length: BLOCKS_PER_DRIVE }, emptyBlock),
  }));
  for (let i = 0; i < count; i++) {
    drives.push(createDrive());
  }
  return { ...state, drives, writtenLength: 0 };
}

function cloneState(state: ArrayState): ArrayState {
  return {
    ...state,
    drives: state.drives.map((drive) => ({
      ...drive,
      blocks: drive.blocks.map((block) => ({ ...block })),
    })),
  };
}

export function failBlock(
  state: ArrayState,
  driveIndex: number,
  blockIndex: number,
): ArrayState {
  const next = cloneState(state);
  const block = next.drives[driveIndex]?.blocks[blockIndex];
  if (!block || !isBlockOccupied(block) || block.failed) return state;
  block.failed = true;
  return next;
}

export function failDrive(state: ArrayState, driveIndex: number): ArrayState {
  const next = cloneState(state);
  const drive = next.drives[driveIndex];
  if (!drive) return state;
  drive.failed = true;
  for (const block of drive.blocks) {
    if (isBlockOccupied(block)) block.failed = true;
  }
  return next;
}

export function randomFailure(state: ArrayState): ArrayState {
  const occupied: BlockRef[] = [];
  state.drives.forEach((drive, driveIndex) => {
    drive.blocks.forEach((block, blockIndex) => {
      if (isBlockOccupied(block) && !block.failed) {
        occupied.push({ driveIndex, blockIndex });
      }
    });
  });

  if (occupied.length === 0) return state;

  if (Math.random() < 0.35) {
    // Only fail drives that still have healthy data, so the action is visible.
    const candidates = [...new Set(occupied.map((ref) => ref.driveIndex))];
    const driveIndex = candidates[Math.floor(Math.random() * candidates.length)];
    return failDrive(state, driveIndex);
  }

  const pick = occupied[Math.floor(Math.random() * occupied.length)];
  return failBlock(state, pick.driveIndex, pick.blockIndex);
}

function blockXorValue(block: Block): number {
  if (block.kind === "parity") return block.parity ?? 0;
  return block.char?.charCodeAt(0) ?? 0;
}

function recoverFromXor(state: ArrayState, target: BlockRef): RecoveryStep {
  // Every occupied block in a stripe row XORs to zero (parity is the XOR of
  // the row's data), so a single missing block is the XOR of all survivors.
  // Empty blocks (rows beyond the written data) simply don't participate.
  const sources: BlockRef[] = [];
  let acc = 0;

  for (let d = 0; d < state.drives.length; d++) {
    if (d === target.driveIndex) continue;
    const block = state.drives[d].blocks[target.blockIndex];
    if (!isBlockOccupied(block)) continue;
    if (block.failed) {
      return {
        target,
        value: "",
        sources: [],
        recovered: false,
        reason:
          "Another block in this stripe also failed. Single parity can recover only one loss per stripe.",
      };
    }
    acc ^= blockXorValue(block);
    sources.push({ driveIndex: d, blockIndex: target.blockIndex });
  }

  if (sources.length === 0) {
    return {
      target,
      value: "",
      sources,
      recovered: false,
      reason: "No surviving blocks left in this stripe.",
    };
  }

  const targetBlock = state.drives[target.driveIndex].blocks[target.blockIndex];
  const value =
    targetBlock.kind === "parity"
      ? formatParity(acc)
      : String.fromCharCode(acc);

  return { target, value, sources, recovered: true };
}

/** RAID 10 pairs drive i with drive i + n/2 (matching the write layout). */
function mirrorPartner(driveIndex: number, driveCount: number): number {
  const half = driveCount / 2;
  return driveIndex < half ? driveIndex + half : driveIndex - half;
}

function recoverFromMirror(state: ArrayState, target: BlockRef): RecoveryStep {
  const partner = mirrorPartner(target.driveIndex, state.drives.length);
  const block = state.drives[partner].blocks[target.blockIndex];

  if (!isBlockOccupied(block) || block.failed) {
    return {
      target,
      value: "",
      sources: [],
      recovered: false,
      reason: "Mirror copy is also missing.",
    };
  }

  return {
    target,
    value: blockDisplay(block),
    sources: [{ driveIndex: partner, blockIndex: target.blockIndex }],
    recovered: true,
  };
}

function recoverFromDuplicate(
  state: ArrayState,
  target: BlockRef,
): RecoveryStep {
  const sources: BlockRef[] = [];

  state.drives.forEach((drive, driveIndex) => {
    if (driveIndex === target.driveIndex) return;
    const block = drive.blocks[target.blockIndex];
    if (!isBlockOccupied(block) || block.failed) return;
    sources.push({ driveIndex, blockIndex: target.blockIndex });
  });

  if (sources.length === 0) {
    return {
      target,
      value: "",
      sources,
      recovered: false,
      reason: "No surviving mirror found.",
    };
  }

  const sourceBlock =
    state.drives[sources[0].driveIndex].blocks[target.blockIndex];
  return {
    target,
    value: blockDisplay(sourceBlock),
    sources,
    recovered: true,
  };
}

function applyRecovery(state: ArrayState, step: RecoveryStep): void {
  if (!step.recovered) return;
  const block = state.drives[step.target.driveIndex].blocks[step.target.blockIndex];
  block.failed = false;
  if (block.kind === "parity") {
    block.parity = Number.parseInt(step.value, 16);
    block.char = undefined;
  } else {
    block.kind = "data";
    block.char = step.value;
    block.parity = undefined;
  }
}

/** Pure version of applyRecovery for the UI's step-by-step animation. */
export function applyRecoveryStep(
  state: ArrayState,
  step: RecoveryStep,
): ArrayState {
  if (!step.recovered) return state;
  const next = cloneState(state);
  applyRecovery(next, step);
  return next;
}

function clearRecoveredDriveFlagsInPlace(state: ArrayState): void {
  for (const drive of state.drives) {
    if (drive.failed && drive.blocks.every((block) => !block.failed)) {
      drive.failed = false;
    }
  }
}

/** Drops the drive-level failed flag once all of a drive's blocks are healthy. */
export function clearRecoveredDriveFlags(state: ArrayState): ArrayState {
  const next = cloneState(state);
  clearRecoveredDriveFlagsInPlace(next);
  return next;
}

export function rebuild(state: ArrayState): RebuildResult {
  const next = cloneState(state);
  const steps: RecoveryStep[] = [];
  let hadFailure = false;
  let recoveredCount = 0;

  next.drives.forEach((drive, driveIndex) => {
    drive.blocks.forEach((block, blockIndex) => {
      if (!block.failed) return;
      hadFailure = true;
      const target = { driveIndex, blockIndex };
      let step: RecoveryStep;

      switch (next.level) {
        case "0":
          step = {
            target,
            value: "",
            sources: [],
            recovered: false,
            reason: "RAID 0 has no redundancy.",
          };
          break;
        case "1":
          step = recoverFromDuplicate(next, target);
          break;
        case "4":
        case "5":
          step = recoverFromXor(next, target);
          break;
        case "10":
          step = recoverFromMirror(next, target);
          break;
      }

      steps.push(step);
      if (step.recovered) {
        applyRecovery(next, step);
        recoveredCount++;
      }
    });
  });

  clearRecoveredDriveFlagsInPlace(next);

  if (!hadFailure) {
    return {
      state: next,
      steps,
      success: true,
      message: "No failed blocks to rebuild.",
    };
  }

  if (next.level === "0") {
    return {
      state: next,
      steps,
      success: false,
      message: "Rebuild failed. RAID 0 cannot recover lost data.",
    };
  }

  const failedSteps = steps.filter((step) => !step.recovered);
  if (failedSteps.length > 0) {
    return {
      state: next,
      steps,
      success: false,
      message: `Rebuild incomplete. Could not recover ${failedSteps.length} block(s).`,
    };
  }

  return {
    state: next,
    steps,
    success: true,
    message: `Rebuild complete. Recovered ${recoveredCount} block(s).`,
  };
}

export function generateRandomText(length = 16): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export function randomStaticChar(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  return chars.charAt(Math.floor(Math.random() * chars.length));
}
