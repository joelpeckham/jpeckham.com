const mmap = math.map;
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

    this.wih = wih || sub(mat(rand([hiddennodes, inputnodes])), 0.5);
    this.who = who || sub(mat(rand([outputnodes, hiddennodes])), 0.5);

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

    const h_in = e("wih * input", { wih, input });
    const h_out = act(h_in);

    const o_in = e("who * h_out", { who, h_out });
    const actual = act(o_in);

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

    const dEdA = sub(target, actual);

    const o_dAdZ = e("actual .* (1 - actual)", { actual });

    const dwho = e("(dEdA .* o_dAdZ) * h_out'", { dEdA, o_dAdZ, h_out });

    const h_err = e("who' * (dEdA .* o_dAdZ)", { who, dEdA, o_dAdZ });

    const h_dAdZ = e("h_out .* (1 - h_out)", { h_out });

    const dwih = e("(h_err .* h_dAdZ) * input'", { h_err, h_dAdZ, input });

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
    return { wih: this.wih, who: this.who };
  }
}

const inputnodes = 25;
var hiddennodes = 6;
const outputnodes = 10;
const learningrate = 0.2;

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

let myNN = new NeuralNetwork(inputnodes, hiddennodes, outputnodes, learningrate);

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
  redrawEdges();
}

function redrawEdges() {
  const graphArea = document.querySelector("#graphArea");
  const graphAreaRect = graphArea.getBoundingClientRect();
  const graphAreaTop = graphAreaRect.top;
  const graphAreaLeft = graphAreaRect.left;
  const inputNodes = document.querySelectorAll("#graphArea .inputNode");
  const hiddenNodes = document.querySelectorAll("#graphArea .hiddenNode");
  const outputNodes = document.querySelectorAll("#graphArea .outputNode");
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
  const svg = document.querySelector("#edgesSvg");
  svg.innerHTML = "";
  function drawEdges(nodePositions1, nodePositions2, nodeSize, weightLayer) {
    let nn = myNN;
    const edgeWeights = weightLayer === "hidden" ? nn.wih : nn.who;
    const minWeight = Math.min(...edgeWeights._data.flat());
    const maxWeight = Math.max(...edgeWeights._data.flat());
    for (let i = 0; i < nodePositions1.length; i++) {
      const node1 = nodePositions1[i];
      for (let j = 0; j < nodePositions2.length; j++) {
        let edgeWeight = edgeWeights._data[j][i];
        const node2 = nodePositions2[j];
        const curve = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
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
          hd = (node2.top - node1.top) / handleScale;
          curvePath = `M ${node1.left} ${node1.top} C ${node1.left + wiggle} ${
            node1.top + hd
          } ${node2.left - wiggle} ${node2.top - hd} ${node2.left + wiggle} ${
            node2.top
          }`;
        }

        const normalizedEdgeWeight =
          (edgeWeight - minWeight) / (maxWeight - minWeight);
        function blendColorValue(a, b, t) {
          return (1 - t) * a + t * b;
        }
        let hue = 195;
        let hue2 = 250;
        let saturation = 75;
        let lightness = 55;
        let mixPercent = (Math.pow((normalizedEdgeWeight - 0.5) * 2, 5) + 1) / 2;
        let mixedHue = blendColorValue(hue, hue2, mixPercent);
        let scaleFactor = Math.abs(normalizedEdgeWeight - 0.5) * 2;
        curve.setAttribute("d", curvePath);
        curve.setAttribute(
          "stroke",
          `hsla(${mixedHue},${
            saturation * Math.pow(scaleFactor, 2)
          }%,${lightness}%,${scaleFactor + 0.1})`,
        );
        curve.setAttribute(
          "stroke-width",
          `${Math.pow(scaleFactor, 2) * 3 + 0.3}`,
        );
        curve.setAttribute("fill", "none");
        curve.addEventListener("mouseover", mouseOverPath);
        curve.addEventListener("mouseout", mouseOutPath);
        curve.setAttribute("weight", edgeWeight);
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
  const inputNodes = document.querySelectorAll("#graphArea .inputNode");
  const hiddenNodes = document.querySelectorAll("#graphArea .hiddenNode");
  const outputNodes = document.querySelectorAll("#graphArea .outputNode");
  const currentInputData =
    current === "sentinel"
      ? trainingData[currentInputSelected % trainingData.length]
      : trainingData[current];
  for (let i = 0; i < inputNodes.length; i++) {
    const node = inputNodes[i];
    const nodeValues = currentInputData[i];
    const nodeColor = nodeValues * 255;
    node.style.backgroundColor = `rgba(${nodeColor}, ${nodeColor}, ${nodeColor}, 1)`;
    const inverseNodeColor = 255 - nodeColor;
    node.style.borderColor = `rgba(${inverseNodeColor}, ${inverseNodeColor}, ${inverseNodeColor}, 1)`;
  }
  const prediction = myNN.predict(currentInputData)._data.map((x) => x[0]);
  const predictedLabel = prediction.indexOf(Math.max(...prediction));
  if (myNN.cache.h_out) {
    const hiddenNodeValues = myNN.cache.h_out._data;
    for (let i = 0; i < hiddenNodes.length; i++) {
      const node = hiddenNodes[i];
      const nodeValues = hiddenNodeValues[i];
      const nodeColor = nodeValues * 255;
      node.style.backgroundColor = `rgba(${nodeColor}, ${nodeColor}, ${nodeColor}, 1)`;
      const inverseNodeColor = 255 - nodeColor;
      node.style.borderColor = `rgba(${inverseNodeColor}, ${inverseNodeColor}, ${inverseNodeColor}, 1)`;
    }
  }
  for (let i = 0; i < outputNodes.length; i++) {
    const node = outputNodes[i];
    const nodeValues = prediction[i];
    const nodeColor = nodeValues * 255;
    node.style.backgroundColor = `rgba(${nodeColor}, ${nodeColor}, ${nodeColor}, 1)`;
    const inverseNodeColor = 255 - nodeColor;
    node.style.borderColor = `rgba(${inverseNodeColor}, ${inverseNodeColor}, ${inverseNodeColor}, 1)`;
    if (i === predictedLabel) {
      node.classList.add("predicted");
    } else {
      node.classList.remove("predicted");
    }
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
  image.addEventListener("click", function () {
    currentInputSelected = i;
    let img = image.querySelector("img");
    img.classList.add("selected");
    for (let j = 0; j < trainingImages.length; j++) {
      if (j !== i) {
        trainingImages[j].querySelector("img").classList.remove("selected");
      }
    }
    updateGraph(i);
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
  const errList = myNN.cache.loss;
  if (errList.length > 0) {
    let loss = errList[errList.length - 1];
    document.querySelector("#lossText").innerText = `${loss.toLocaleString(
      "en-US",
      { maximumFractionDigits: 5 },
    )}`;
  } else {
    document.querySelector("#lossText").innerText = `N/A`;
  }
  document.querySelector("#accuracy").innerText = `${accuracy}`;
  document.querySelector("#trainingIterations").innerText =
    `${currentTrainingIteration}`;
  let dataAndLabels = getDataAndLabels();
  myChart.data.labels = dataAndLabels[1];
  myChart.data.datasets[0].data = dataAndLabels[0];
  myChart.update();
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
  resetApp();
  resizeSvgViewBox();
}

const hiddenNodesInput = document.querySelector("#hiddenNodes");
hiddenNodesInput.addEventListener("change", updateHiddenLayer);

const resetButton = document.querySelector("#resetButton");
resetButton.addEventListener("click", resetApp);

let circle = document.getElementById("circle");
let circleContainer = document.getElementById("gaWrapper");
const onMouseMove = (ev) => {
  let circleContainerX = circleContainer.getBoundingClientRect().x;
  let circleContainerY = circleContainer.getBoundingClientRect().y;
  circle.style.left = ev.clientX - circleContainerX + "px";
  circle.style.top = ev.clientY - circleContainerY - 20 + "px";
};
document.addEventListener("mousemove", onMouseMove);

function mouseOverPath(ev) {
  circle.classList.add("activeCircle");
  const path = ev.target;
  let pathWeight = parseFloat(path.getAttribute("weight"));
  circle.innerText = `${pathWeight.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })}`;
}
function mouseOutPath() {
  circle.classList.remove("activeCircle");
}

const firstCol = document.querySelector(".gaCol.col_1");
firstCol.addEventListener("mouseup", () => {
  firstCol.classList.toggle("grid");
  firstCol.classList.toggle("flex");
  resizeSvgViewBox();
  setTimeout(() => {
    resizeSvgViewBox();
  }, 20);
});

var currentInputSelected = 0;

function getDataAndLabels(size = 100) {
  let rawData = myNN.cache.loss;
  let rawLabels = [...Array(myNN.cache.loss.length).keys()];
  if (rawData.length < size) {
    return [rawData, rawLabels];
  }
  let first = rawData[0];
  let step = Math.floor(rawData.length / size);
  let data = [first];
  let labels = [0];
  function movingAverage(arr, n) {
    let ret = [];
    for (let i = 0; i < arr.length - n + 1; i++) {
      ret.push(arr.slice(i, i + n).reduce((a, b) => a + b) / n);
    }
    return ret;
  }
  let avgData = movingAverage(rawData, 10);
  for (let i = 1; i < size; i++) {
    let dp = avgData[i * step];
    data.push(dp);
    labels.push(i * step);
  }
  data.push(avgData[avgData.length - 1]);
  labels.push(avgData.length - 1);
  return [data, labels];
}

const ctx = document.getElementById("myChart");
let dataAndLabels = getDataAndLabels();
const data = {
  labels: dataAndLabels[1],
  datasets: [
    {
      label: "Loss over Iterations",
      data: dataAndLabels[0],
      fill: false,
      borderColor: "hsl(195,75%,55%)",
      tension: 0.1,
      pointRadius: 0,
    },
  ],
};

let myChart = new Chart(ctx, {
  type: "line",
  data: data,
  responsive: true,
  options: {
    bezierCurve: false,
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    maintainAspectRatio: false,
    scales: {
      y: { title: { display: true, text: "Loss" } },
      x: { title: { display: true, text: "Iteration" } },
    },
  },
});

resetApp();
