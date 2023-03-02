const mmap = math.map; // to be used to pass each element of a matrix to a function
const rand = math.random;
const transp = math.transpose;
const mat = math.matrix;
const e = math.evaluate;
const sub = math.subtract;
const sqr = math.square;
const sum = math.sum;

class NeuralNetwork {
  constructor(inputnodes, hiddennodes, outputnodes, learningrate, wih, who) {
    this.inputnodes = inputnodes;
    this.hiddennodes = hiddennodes;
    this.outputnodes = outputnodes;
    this.learningrate = learningrate;

    /* initialise the weights either randomly or, if passed in as arguments, with pretrained values */
    /* wih = weights of input-to-hidden layer */
    /* who = weights of hidden-to-output layer */
    this.wih = wih || sub(mat(rand([hiddennodes, inputnodes])), 0.5);
    this.who = who || sub(mat(rand([outputnodes, hiddennodes])), 0.5);

    /* the sigmoid activation function */
    this.act = (matrix) => mmap(matrix, (x) => 1 / (1 + Math.exp(-x)));
  }

  static normalizeData = (data) => {
    return data.map((e) => (e / 255) * 0.99 + 0.01);
  };

  cache = { loss: [] };

  forward = (input) => {
    const wih = this.wih;
    const who = this.who;
    const act = this.act;

    input = transp(mat([input]));

    /* hidden layer */
    const h_in = e("wih * input", { wih, input });
    const h_out = act(h_in);

    /* output layer */
    const o_in = e("who * h_out", { who, h_out });
    const actual = act(o_in);

    /* these values are needed later in "backward" */
    this.cache.input = input;
    this.cache.h_out = h_out;
    this.cache.actual = actual;

    return actual;
  };

  backward = (target) => {
    const who = this.who;
    const input = this.cache.input;
    const h_out = this.cache.h_out;
    const actual = this.cache.actual;

    target = transp(mat([target]));

    // calculate the gradient of the error function (E) w.r.t the activation function (A)
    const dEdA = sub(target, actual);

    // calculate the gradient of the activation function (A) w.r.t the weighted sums (Z) of the output layer
    const o_dAdZ = e("actual .* (1 - actual)", {
      actual,
    });

    // calculate the error gradient of the loss function w.r.t the weights of the hidden-to-output layer
    const dwho = e("(dEdA .* o_dAdZ) * h_out'", {
      dEdA,
      o_dAdZ,
      h_out,
    });

    // calculate the weighted error for the hidden layer
    const h_err = e("who' * (dEdA .* o_dAdZ)", {
      who,
      dEdA,
      o_dAdZ,
    });

    // calculate the gradient of the activation function (A) w.r.t the weighted sums (Z) of the hidden layer
    const h_dAdZ = e("h_out .* (1 - h_out)", {
      h_out,
    });

    // calculate the error gradient of the loss function w.r.t the weights of the input-to-hidden layer
    const dwih = e("(h_err .* h_dAdZ) * input'", {
      h_err,
      h_dAdZ,
      input,
    });

    this.cache.dwih = dwih;
    this.cache.dwho = dwho;
    this.cache.loss.push(sum(mmap(dEdA, sqr)));
  };

  update = () => {
    const wih = this.wih;
    const who = this.who;
    const dwih = this.cache.dwih;
    const dwho = this.cache.dwho;
    const r = this.learningrate;

    /* update the current weights of each layer with their corresponding error gradients */
    /* error gradients are negated by using the positve sign */
    this.wih = e("wih + (r .* dwih)", { wih, r, dwih });
    this.who = e("who + (r .* dwho)", { who, r, dwho });
  };

  predict = (input) => {
    return this.forward(input);
  };

  train = (input, target) => {
    this.forward(input);
    this.backward(target);
    this.update();
  };
}

/* neural network's hyper parameters */
const inputnodes = 25;
const hiddennodes = 50;
const outputnodes = 10;
const learningrate = 0.2;
const threshold = 0.5;
let iter = 0;
const iterations = 1000;

// 5x5 pixel image of 0-9
const trainingData = [
  [0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0], // 0
  [0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0], // 1
];

const trainingLabels = [
  0,
  1
];


let myNN = new NeuralNetwork(inputnodes, hiddennodes, outputnodes, learningrate);

function oneHotEncoding(label) {
    const encoded = new Array(10).fill(0.0);
    encoded[label] = 0.99;
    return encoded;
}


const encodedTrainLabels = trainingLabels.map((label) => oneHotEncoding(label));
console.log(trainingData);
console.log(encodedTrainLabels);

// Train the neural network
for (let i = 0; i < iterations; i++) {
    trainingData.forEach((data, i) => {
        myNN.train(data, encodedTrainLabels[i]);
    });
}

// Predict the output
const prediction = myNN.predict(trainingData[0]);
console.log(prediction); 

// Predict the output
const prediction2 = myNN.predict(trainingData[1]);
console.log(prediction2); 
