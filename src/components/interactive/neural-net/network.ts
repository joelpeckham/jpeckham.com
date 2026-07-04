// A tiny fully-connected neural network implemented in plain TypeScript. No
// linear-algebra dependency: the matrices are just number[][] and the math is
// spelled out so the forward/backward passes map directly onto the article.
//
//   input (25) --wih--> hidden (N) --who--> output (10)
//
// Every layer uses the logistic sigmoid activation. Training is plain
// stochastic gradient descent on the sum-of-squared-errors loss.

export type Matrix = number[][];

type Rng = () => number;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// Small deterministic PRNG. Used to seed the *initial* network so the
// server-rendered and client-rendered weights match (avoiding a hydration
// mismatch); resets fall back to Math.random for genuinely random weights.
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A [rows x cols] matrix of random weights centered on zero (range -0.5..0.5),
// which is how the original visualizer seeded its weights.
function randomMatrix(rows: number, cols: number, rng: Rng): Matrix {
  const m: Matrix = [];
  for (let r = 0; r < rows; r++) {
    const row = new Array<number>(cols);
    for (let c = 0; c < cols; c++) {
      row[c] = rng() - 0.5;
    }
    m[r] = row;
  }
  return m;
}

export type ForwardResult = {
  input: number[];
  hidden: number[];
  output: number[];
};

export class NeuralNetwork {
  readonly inputNodes: number;
  readonly hiddenNodes: number;
  readonly outputNodes: number;
  learningRate: number;

  // wih: weights from input -> hidden, dimensions [hidden][input]
  // who: weights from hidden -> output, dimensions [output][hidden]
  wih: Matrix;
  who: Matrix;

  // Sum-of-squared-error loss recorded once per training step.
  readonly lossHistory: number[] = [];

  constructor(
    inputNodes: number,
    hiddenNodes: number,
    outputNodes: number,
    learningRate: number,
    rng: Rng = Math.random,
  ) {
    this.inputNodes = inputNodes;
    this.hiddenNodes = hiddenNodes;
    this.outputNodes = outputNodes;
    this.learningRate = learningRate;
    this.wih = randomMatrix(hiddenNodes, inputNodes, rng);
    this.who = randomMatrix(outputNodes, hiddenNodes, rng);
  }

  // Run an input through the network, returning the activations of every layer.
  forward(input: number[]): ForwardResult {
    const hidden = new Array<number>(this.hiddenNodes);
    for (let j = 0; j < this.hiddenNodes; j++) {
      let sum = 0;
      const row = this.wih[j];
      for (let i = 0; i < this.inputNodes; i++) {
        sum += row[i] * input[i];
      }
      hidden[j] = sigmoid(sum);
    }

    const output = new Array<number>(this.outputNodes);
    for (let k = 0; k < this.outputNodes; k++) {
      let sum = 0;
      const row = this.who[k];
      for (let j = 0; j < this.hiddenNodes; j++) {
        sum += row[j] * hidden[j];
      }
      output[k] = sigmoid(sum);
    }

    const result: ForwardResult = { input, hidden, output };
    return result;
  }

  predict(input: number[]): ForwardResult {
    return this.forward(input);
  }

  updateLearningRate(rate: number): void {
    this.learningRate = rate;
  }

  // One SGD step: forward pass, backpropagate the error, update the weights.
  train(input: number[], target: number[]): void {
    const { hidden, output } = this.forward(input);

    // Output-layer error and its gradient through the sigmoid.
    const outputDelta = new Array<number>(this.outputNodes);
    let loss = 0;
    for (let k = 0; k < this.outputNodes; k++) {
      const err = target[k] - output[k];
      loss += err * err;
      outputDelta[k] = err * output[k] * (1 - output[k]);
    }
    this.lossHistory.push(loss);

    // Backpropagate the error to the hidden layer.
    const hiddenDelta = new Array<number>(this.hiddenNodes);
    for (let j = 0; j < this.hiddenNodes; j++) {
      let err = 0;
      for (let k = 0; k < this.outputNodes; k++) {
        err += this.who[k][j] * outputDelta[k];
      }
      hiddenDelta[j] = err * hidden[j] * (1 - hidden[j]);
    }

    // Gradient ascent on the negative loss == descent on the loss.
    const lr = this.learningRate;
    for (let k = 0; k < this.outputNodes; k++) {
      const row = this.who[k];
      const d = outputDelta[k];
      for (let j = 0; j < this.hiddenNodes; j++) {
        row[j] += lr * d * hidden[j];
      }
    }
    for (let j = 0; j < this.hiddenNodes; j++) {
      const row = this.wih[j];
      const d = hiddenDelta[j];
      for (let i = 0; i < this.inputNodes; i++) {
        row[i] += lr * d * input[i];
      }
    }
  }

  // Fraction of the provided samples classified correctly (argmax == label),
  // expressed as a percentage.
  accuracy(samples: { label: number; bits: number[] }[]): number {
    if (samples.length === 0) return 0;
    let correct = 0;
    for (const sample of samples) {
      const { output } = this.forward(sample.bits);
      let best = 0;
      for (let k = 1; k < output.length; k++) {
        if (output[k] > output[best]) best = k;
      }
      if (best === sample.label) correct++;
    }
    return (correct / samples.length) * 100;
  }
}
