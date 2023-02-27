function fyshuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  let puzStrVal = "";
  for (let i = 0; i < arr.length; i++) {
    puzStrVal += arr[i];
  }
  return puzStrVal;
}
function randomizePuzzleString() {
  let puzStr = document.getElementById("puzStr");
  let puzStrVal = fyshuffle(["1", "2", "3", "4", "5", "6", "7", "8", "-"]);
  while (!isSolvable(puzStrVal)) {
    puzStrVal = fyshuffle(["1", "2", "3", "4", "5", "6", "7", "8", "-"]);
  }
  puzStr.value = puzStrVal;
  verifyPuzzleString();
}

function verifyPuzzleString() {
  let puzStr = document.getElementById("puzStr");
  let solveBtn = document.querySelector("#solveBtn");
  let puzStrVal = puzStr.value;
  // render puzzle
  let parent = document.querySelector("#puzzleContainer");
  parent.innerHTML = "";
  let np = createPuzzleElem(puzStrVal);
  parent.appendChild(np);
  let tm = document.querySelector("#timeMachine input");
  tm.disabled = true;
  tm.value = 0;
  document.querySelector("#arrowNav p.bw").classList.add("disabled");
  document.querySelector("#arrowNav p.fw").classList.add("disabled");
  document.querySelector("#stats p").innerText = "Stats:";
  lastSolution = null;
  let neededChars = ["1", "2", "3", "4", "5", "6", "7", "8", "-"];
  // Check if the string is 9 characters long and contains needed chars in any order.
  if (
    !puzStrVal.length == 9 ||
    !neededChars.every((val) => puzStrVal.includes(val)) ||
    !isSolvable(puzStrVal)
  ) {
    puzStr.classList.add("invalidInput");
    parent.classList.add("invalidPuzzle");

    solveBtn.disabled = true;
  } else {
    puzStr.classList.remove("invalidInput");
    parent.classList.remove("invalidPuzzle");
    solveBtn.disabled = false;
  }
}

function createPuzzleElem(puzzle) {
  // deep copy templete element
  templateElem = document.querySelector("#puzzleTemplate");
  puzzleElem = templateElem.cloneNode(true);
  puzzleElem.classList.remove("invisible");
  let transitionEnd = whichTransitionEvent();
  for (let i = 0; i < puzzle.length; i++) {
    let pelem = puzzleElem.querySelector(`#ps_${i} p`);
    pelem.innerText = puzzle[i];
    let puzzlesquare = puzzleElem.querySelector(`#ps_${i}`);
    puzzlesquare.classList.add(`pn_${puzzle[i]}`);
    puzzlesquare.addEventListener(transitionEnd, ()=>{puzzlesquare.classList.add("doneTransition");}, false);
    if (puzzle[i] == "-") {
      pelem.classList.add("empty");
      puzzlesquare.classList.add("empty");
    }
  }
  
  return puzzleElem;
}
var lastSolution = null;
async function solve() {
  let puzStr = document.getElementById("puzStr");
  let puzStrVal = puzStr.value;
  let heurFunc = document.getElementById("heurFunc");
  if (heurFunc.value == "manhattan") {
    heurFunc = manhattanDistance;
  } else if (heurFunc.value == "hamming") {
    heurFunc = hammingDistance;
  }
  let searchFunc = document.getElementById("searchFunc");
  if (searchFunc.value == "astar") {
    searchFunc = a_star_search;
  } else if (searchFunc.value == "bfs") {
    searchFunc = breadth_first_search;
  } else if (searchFunc.value == "bestfs") {
    searchFunc = best_first_search;
  }
  document.getElementById("loading").classList.remove("invisible");
  await new Promise((r) => setTimeout(r, 100));
  startTime = new Date();
  [solution, maxDepth, totalVisited] = await searchFunc(heurFunc, puzStrVal);
  endTime = new Date();
  timeDelta = (endTime - startTime) / 1000;
  console.info(`Solved in ${timeDelta} seconds`);
  document.querySelector("#stats p").innerText = `Stats: "${puzStrVal}" solved in ${timeDelta} seconds. Max depth: ${maxDepth}. Total visited: ${totalVisited}. Solution length: ${solution.length}`;
  lastSolution = solution;
  console.info(solution);
  document.getElementById("loading").classList.add("invisible");
  let timeMachine = document.querySelector("#timeMachine input");
  timeMachine.max = solution.length - 1;
  timeMachine.disabled = false;
  timeMachine.value = 0;
  // document.querySelector("#arrowNav p.bw").classList.remove("disabled");
  document.querySelector("#arrowNav p.fw").classList.remove("disabled");
  let tmInput = () => {
    if (timeMachine.valueAsNumber == 0) {
      document.querySelector("#arrowNav p.bw").classList.add("disabled");
    }
    else if (timeMachine.value == timeMachine.max) {
      document.querySelector("#arrowNav p.fw").classList.add("disabled");
    }
    else {
      document.querySelector("#arrowNav p.bw").classList.remove("disabled");
      document.querySelector("#arrowNav p.fw").classList.remove("disabled");
    }
    let parent = document.querySelector("#puzzleContainer");
    parent.innerHTML = "";
      let np = createPuzzleElem(solution[timeMachine.value]);
      parent.appendChild(np);
  }
  timeMachine.addEventListener("input", tmInput);
  tmInput();
}
var animationInProgress = false;

function animateForward() {
  let timeMachine = document.querySelector("#timeMachine input");
  if (animationInProgress || timeMachine.disabled == true) return;
  if (timeMachine.valueAsNumber < parseInt(timeMachine.max)) {
    timeMachine.valueAsNumber++;
    animateTranslations(lastSolution, timeMachine.valueAsNumber - 1, 1);
    document.querySelector("#arrowNav p.bw").classList.remove("disabled");
  }
  if (timeMachine.valueAsNumber == parseInt(timeMachine.max)) {
    document.querySelector("#arrowNav p.fw").classList.add("disabled");
  }
}
function animateBackward() {
  let timeMachine = document.querySelector("#timeMachine input");
  if (animationInProgress || timeMachine.disabled == true) return;
  if (timeMachine.valueAsNumber > 0) {
    timeMachine.valueAsNumber--;
    animateTranslations(lastSolution, timeMachine.valueAsNumber + 1, -1);
    document.querySelector("#arrowNav p.fw").classList.remove("disabled");
  }
  if (timeMachine.valueAsNumber == 0) {
    document.querySelector("#arrowNav p.bw").classList.add("disabled");
  }
}

function animateTranslations(solution = lastSolution, start, increment) {
  let parent = document.querySelector("#puzzleContainer");
  let puzzleElem = parent.querySelector(".puzzle");
  let current = solution[start];
  let next = solution[start + increment];
  let movingElemDigit = current[next.indexOf("-")];
  let movingElem = puzzleElem.querySelector(`.pn_${movingElemDigit}`);
  let movement_vector_x = next.indexOf("-") % 3 - current.indexOf("-") % 3;
  let movement_vector_y = Math.floor(next.indexOf("-") / 3) - Math.floor(current.indexOf("-") / 3);
  let mVec = [movement_vector_x, movement_vector_y];
  movingElem.style.transform = `translate(${-mVec[0] * 100}%, ${-mVec[1] * 100}%)`;
  animationInProgress = true;
  let interval = setInterval(() => {
    if (movingElem.classList.contains("doneTransition")) {
      clearInterval(interval);
      parent.innerHTML = "";
      let np = createPuzzleElem(next);
      parent.appendChild(np);
      animationInProgress = false;
    }
  }, 20);
}

function whichTransitionEvent(){
  var t;
  var el = document.createElement('fakeelement');
  var transitions = {
    'transition':'transitionend',
    'OTransition':'oTransitionEnd',
    'MozTransition':'transitionend',
    'WebkitTransition':'webkitTransitionEnd'
  }

  for(t in transitions){
      if( el.style[t] !== undefined ){
          return transitions[t];
      }
  }
}

function isSolvable(puzzle) {
  var inversions = 0;
  puzzle.replace("-", "0");
  var puzzleArray = [];
  for (var i = 0; i < puzzle.length; i++) {
    puzzleArray.push(parseInt(puzzle.charAt(i)));
  }

  // Count the number of inversions
  for (var i = 0; i < puzzleArray.length - 1; i++) {
    for (var j = i + 1; j < puzzleArray.length; j++) {
      if (
        puzzleArray[i] != 0 &&
        puzzleArray[j] != 0 &&
        puzzleArray[i] > puzzleArray[j]
      ) {
        inversions++;
      }
    }
  }

  // Check if the number of inversions is even or odd
  return inversions % 2 == 0;
}
