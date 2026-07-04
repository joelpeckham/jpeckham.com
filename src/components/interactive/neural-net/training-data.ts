// Ten hand-drawn 5x5 bitmaps of the numerals 0-9. Each is a 25-length vector
// read left-to-right, top-to-bottom, where 1 is a black (inked) pixel and 0 is
// a white pixel. These same ten images are the entire training *and* test set,
// which is what makes the network so prone to overfitting.

export const GRID_SIZE = 5;
export const INPUT_NODES = GRID_SIZE * GRID_SIZE; // 25
export const OUTPUT_NODES = 10;

export type DigitSample = {
  label: number;
  bits: number[];
};

export const trainingData: DigitSample[] = [
  { label: 0, bits: [0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0] },
  { label: 1, bits: [0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0] },
  { label: 2, bits: [0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1] },
  { label: 3, bits: [0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1] },
  { label: 4, bits: [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
  { label: 5, bits: [0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1] },
  { label: 6, bits: [0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1] },
  { label: 7, bits: [0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0] },
  { label: 8, bits: [0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1] },
  { label: 9, bits: [0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1] },
];

// One-hot target for a label. We use 0.99 for the correct class (rather than a
// hard 1.0) because the sigmoid output can only *approach* 1 asymptotically, so
// 0.99 is a reachable target that keeps the weights from being pushed to
// infinity while training.
export function oneHot(label: number): number[] {
  const target = new Array<number>(OUTPUT_NODES).fill(0.0);
  target[label] = 0.99;
  return target;
}

export const targets: number[][] = trainingData.map((sample) =>
  oneHot(sample.label),
);
