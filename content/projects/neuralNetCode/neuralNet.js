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
  getWeights() {
    return {
      wih: this.wih,
      who: this.who,
    };
  }
}

/* neural network's hyper parameters */
const inputnodes = 25;
var hiddennodes = 6;
const outputnodes = 10;
const learningrate = 0.2;
const threshold = 0.5;
let iter = 0;
const iterations = 2000;

// 5x5 pixel image of 0-9
const trainingData = [
  [0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0],
  [0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
  [0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1],
  [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1],
  [0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
  [0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1],
];

const trainingLabels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

let myNN = new NeuralNetwork(
  inputnodes,
  hiddennodes,
  outputnodes,
  learningrate
);

function oneHotEncoding(label) {
  const encoded = new Array(10).fill(0.0);
  encoded[label] = 0.99;
  return encoded;
}

const encodedTrainLabels = trainingLabels.map((label) => oneHotEncoding(label));

function resizeSvgViewBox() {
  const svg = document.querySelector("#edgesSvg");
  const svgContainer = document.querySelector("#svgContainer");
  const svgWidth = svgContainer.clientWidth;
  const svgHeight = svgContainer.clientHeight;
  svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  // redrawEdges();
}
function redrawEdges() {
  // Start by finding the positions of all the nodes relative to the top left of the graph area
  const graphArea = document.querySelector("#graphArea");
  const graphAreaRect = graphArea.getBoundingClientRect();
  const graphAreaTop = graphAreaRect.top;
  const graphAreaLeft = graphAreaRect.left;
  const inputNodes = document.querySelectorAll(".inputNode");
  const hiddenNodes = document.querySelectorAll(".hiddenNode");
  const outputNodes = document.querySelectorAll(".outputNode");
  // Get the positions each node and store them in an array
  function getNodePositions(nodeList) {
    const nodePositions = [];
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];
      const nodeRect = node.getBoundingClientRect();
      let nodeTop = nodeRect.top - graphAreaTop;
      let nodeLeft = nodeRect.left - graphAreaLeft;
      const nodeWidth = nodeRect.width;
      const nodeHeight = nodeRect.height;
      nodeTop += nodeHeight / 2;
      nodeLeft += nodeWidth / 2;
      nodePositions.push({ top: nodeTop, left: nodeLeft });
    }
    return nodePositions;
  }
  const inputNodePositions = getNodePositions(inputNodes);
  const hiddenNodePositions = getNodePositions(hiddenNodes);
  const outputNodePositions = getNodePositions(outputNodes);
  // Now that we have the positions of all the nodes, we can draw the edges
  const svg = document.querySelector("#edgesSvg");
  // First, clear the svg of any existing edges
  svg.innerHTML = "";
  // Now, draw the edges
  function drawEdges(nodePositions1, nodePositions2, nodeSize, weightLayer) {
    const edgeWeights = weightLayer === "hidden" ? myNN.wih : myNN.who;
    const minWeight = Math.min(...edgeWeights._data.flat());
    const maxWeight = Math.max(...edgeWeights._data.flat());

    for (let i = 0; i < nodePositions1.length; i++) {
      const node1 = nodePositions1[i];
      for (let j = 0; j < nodePositions2.length; j++) {
        let edgeWeight = edgeWeights._data[j][i];
        const node2 = nodePositions2[j];
        const curve = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        let wiggle = Math.floor((Math.random() * nodeWidth) / 3);
        const graphArea = document.querySelector("#graphArea");
        let computedStyle = window.getComputedStyle(graphArea);
        const handleScale = 3;
        let hd = (node2.left - node1.left) / handleScale;
        let curvePath = `M ${node1.left} ${node1.top} C ${node1.left + hd} ${
          node1.top + wiggle
        } ${node2.left - hd} ${node2.top - wiggle} ${node2.left} ${
          node2.top + wiggle
        }`;
        if (computedStyle.gridTemplateRows.split(" ").length > 1) {
          //Graph is vertical, so adjust the curve path handle positions
          hd = (node2.top - node1.top) / handleScale;
          curvePath = `M ${node1.left} ${node1.top} C ${node1.left + wiggle} ${
            node1.top + hd
          } ${node2.left - wiggle} ${node2.top - hd} ${node2.left + wiggle} ${
            node2.top
          }`;
        }
        const normalizedEdgeWeight = Math.abs(
          (edgeWeight - minWeight) / (maxWeight - minWeight)
        );
        curve.setAttribute("d", curvePath);
        curve.setAttribute(
          "stroke",
          `rgba(0,0,0,${(normalizedEdgeWeight + 0.2) * 0.7})`
        );
        curve.setAttribute("stroke-width", `${normalizedEdgeWeight * 2}`);
        curve.setAttribute("fill", "none");
        svg.appendChild(curve);
      }
    }
  }
  let nodeWidth = document
    .querySelector(".inputNode")
    .getBoundingClientRect().width;
  drawEdges(inputNodePositions, hiddenNodePositions, nodeWidth, "hidden");
  drawEdges(hiddenNodePositions, outputNodePositions, nodeWidth, "output");
}
window.addEventListener("resize", resizeSvgViewBox);
resizeSvgViewBox();

var currentTrainingIteration = 0;
function runTrainingIteration(display = true) {
  const currentInputData =
    trainingData[currentTrainingIteration % trainingData.length];
  const currentTrainingLabel =
    encodedTrainLabels[currentTrainingIteration % trainingData.length];
  myNN.train(currentInputData, currentTrainingLabel);
  if (display) {
    updateGraph();
    redrawEdges();
  }
  currentTrainingIteration++;
}

function updateGraph(current = "sentinel") {
  // Update the graph
  const inputNodes = document.querySelectorAll(".inputNode");
  const hiddenNodes = document.querySelectorAll(".hiddenNode");
  const outputNodes = document.querySelectorAll(".outputNode");
  const currentInputData =
    current === "sentinel"
      ? trainingData[currentTrainingIteration % trainingData.length]
      : trainingData[current];
  // Update the input nodes
  for (let i = 0; i < inputNodes.length; i++) {
    const node = inputNodes[i];
    const nodeValues = currentInputData[i];
    // update node color
    const nodeColor = nodeValues * 255;
    node.style.backgroundColor = `rgba(${nodeColor}, ${nodeColor}, ${nodeColor}, 1)`;
    const inverseNodeColor = 255 - nodeColor;
    node.style.borderColor = `rgba(${inverseNodeColor}, ${inverseNodeColor}, ${inverseNodeColor}, 1)`;
  }
  // Update the hidden nodes
  if (myNN.cache.h_out) {
    const hiddenNodeValues = myNN.cache.h_out._data;
    for (let i = 0; i < hiddenNodes.length; i++) {
      const node = hiddenNodes[i];
      const nodeValues = hiddenNodeValues[i];
      // update node color
      const nodeColor = nodeValues * 255;
      node.style.backgroundColor = `rgba(${nodeColor}, ${nodeColor}, ${nodeColor}, 1)`;
      const inverseNodeColor = 255 - nodeColor;
      node.style.borderColor = `rgba(${inverseNodeColor}, ${inverseNodeColor}, ${inverseNodeColor}, 1)`;
    }
  }
  // Update the output nodes
  const prediction = myNN.predict(currentInputData)._data.map((x) => x[0]);
  for (let i = 0; i < outputNodes.length; i++) {
    const node = outputNodes[i];
    const nodeValues = prediction[i];
    // update node color
    const nodeColor = nodeValues * 255;
    node.style.backgroundColor = `rgba(${nodeColor}, ${nodeColor}, ${nodeColor}, 1)`;
    const inverseNodeColor = 255 - nodeColor;
    node.style.borderColor = `rgba(${inverseNodeColor}, ${inverseNodeColor}, ${inverseNodeColor}, 1)`;
  }
}

document.querySelector("#trainButton").addEventListener("click", function () {
  runTrainingStep();
});

function runTrainingStep() {
  const trainingStep = document.querySelector("#stepSize").valueAsNumber;
  for (let i = 0; i < trainingStep; i++) {
    runTrainingIteration(false);
  }
  updateGraph();
  redrawEdges();
  updateStats();
}

function resetApp() {
  myNN = new NeuralNetwork(inputnodes, hiddennodes, outputnodes, learningrate);
  currentTrainingIteration = 0;
  updateStats();
  updateGraph();
  redrawEdges();
}

const trainingImages = document.querySelectorAll(".trainingImage");

for (let i = 0; i < trainingImages.length; i++) {
  const image = trainingImages[i];
  image.addEventListener("mouseover", function () {
    const prediction = myNN.predict(trainingData[i])._data.map((x) => x[0]);

    updateGraph(i);
    // redrawEdges();
  });
}

function calculateAccuracy() {
  let correct = 0;
  for (let i = 0; i < trainingData.length; i++) {
    const prediction = myNN.predict(trainingData[i])._data.map((x) => x[0]);
    const predictedLabel = prediction.indexOf(Math.max(...prediction));
    if (predictedLabel === trainingLabels[i]) {
      correct++;
    }
  }
  return (correct / trainingData.length) * 100;
}

function updateStats() {
  const accuracy = calculateAccuracy();
  document.querySelector("#accuracy").innerText = `${accuracy}`;
  document.querySelector(
    "#trainingIterations"
  ).innerText = `${currentTrainingIteration}`;
}

function updateHiddenLayer() {
  hiddennodes = document.querySelector("#hiddenNodes").valueAsNumber;
  nodeDomContainer = document.querySelector("div.gaCol.col_2");
  nodeDomContainer.innerHTML = "";
  for (let i = 0; i < hiddennodes; i++) {
    const node = document.createElement("div");
    node.classList.add("hiddenNode");
    node.classList.add("node");
    nodeDomContainer.appendChild(node);
  }
  resizeSvgViewBox();
  resetApp();
}

const hiddenNodesInput = document.querySelector("#hiddenNodes");
hiddenNodesInput.addEventListener("change", updateHiddenLayer);

const resetButton = document.querySelector("#resetButton");
resetButton.addEventListener("click", resetApp);

resetApp();
