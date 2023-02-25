class priorityQueue {
  constructor() {
    this.ids = [];
    this.values = [];
    this.length = 0;
  }

  clear() {
    this.length = 0;
  }

  push(id, value) {
    let pos = this.length++;

    while (pos > 0) {
      const parent = (pos - 1) >> 1;
      const parentValue = this.values[parent];
      if (value >= parentValue) break;
      this.ids[pos] = this.ids[parent];
      this.values[pos] = parentValue;
      pos = parent;
    }

    this.ids[pos] = id;
    this.values[pos] = value;
  }

  pop() {
    if (this.length === 0) return undefined;

    const top = this.ids[0];
    this.length--;

    if (this.length > 0) {
      const id = (this.ids[0] = this.ids[this.length]);
      const value = (this.values[0] = this.values[this.length]);
      const halfLength = this.length >> 1;
      let pos = 0;

      while (pos < halfLength) {
        let left = (pos << 1) + 1;
        const right = left + 1;
        let bestIndex = this.ids[left];
        let bestValue = this.values[left];
        const rightValue = this.values[right];

        if (right < this.length && rightValue < bestValue) {
          left = right;
          bestIndex = this.ids[right];
          bestValue = rightValue;
        }
        if (bestValue >= value) break;

        this.ids[pos] = bestIndex;
        this.values[pos] = bestValue;
        pos = left;
      }

      this.ids[pos] = id;
      this.values[pos] = value;
    }

    return top;
  }

  peek() {
    if (this.length === 0) return undefined;
    return this.ids[0];
  }

  peekValue() {
    if (this.length === 0) return undefined;
    return this.values[0];
  }

  shrink() {
    this.ids.length = this.values.length = this.length;
  }
}

function manhattanDistance(puzzle) {
  let distance = 0;
  for (let i = 0; i < puzzle.length; i++) {
    if (puzzle[i] == "-") {
      continue;
    }
    let targetIndex = parseInt(puzzle[i]) - 1;
    let targetCoordinates = [Math.floor(targetIndex / 3), targetIndex % 3];
    distance +=
      Math.abs(targetCoordinates[0] - Math.floor(i / 3)) +
      Math.abs(targetCoordinates[1] - (i % 3));
  }
  return distance;
}

function hammingDistance(puzzle) {
  let distance = 0;
  target = "12345678-";
  for (let i = 0; i < puzzle.length; i++) {
    if (puzzle[i] != target[i]) {
      distance++;
    }
  }
  return distance;
}

function getPuzzleChildren(puzzle) {
  let blankIndex = puzzle.indexOf("-");
  let blankCoordinates = [Math.floor(blankIndex / 3), blankIndex % 3];
  let potentialChildren = [];
  let directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let i = 0; i < directions.length; i++) {
    let newBlankCoordinates = [
      blankCoordinates[0] + directions[i][0],
      blankCoordinates[1] + directions[i][1],
    ];
    if (
      newBlankCoordinates[0] < 0 ||
      newBlankCoordinates[0] > 2 ||
      newBlankCoordinates[1] < 0 ||
      newBlankCoordinates[1] > 2
    ) {
      continue;
    }
    let newBlankIndex = newBlankCoordinates[0] * 3 + newBlankCoordinates[1];
    let newPuzzle = puzzle.split("");
    newPuzzle[blankIndex] = newPuzzle[newBlankIndex];
    newPuzzle[newBlankIndex] = "-";
    potentialChildren.push(newPuzzle.join(""));
  }
  return potentialChildren;
}

async function a_star_search(heuristic, puzzle, targetPuzzle = "12345678-") {
  let q = new priorityQueue();
  let visited = new Set();
  let parent = {};
  let g = {};
  let f = {};
  let maxDepth = 0;
  let totalVisited = 0;
  q.push(puzzle, 0);
  g[puzzle] = 0;
  f[puzzle] = heuristic(puzzle);
  while (q.length > 0) {
    let currentPuzzle = q.pop();
    if (currentPuzzle == targetPuzzle) {
      let path = [];
      while (currentPuzzle != puzzle) {
        path.push(currentPuzzle);
        currentPuzzle = parent[currentPuzzle];
      }
      path.push(puzzle);
      path.reverse();
      console.log("Max depth reached:", maxDepth);
      console.log("Total puzzles visited:", totalVisited);
      return [path, maxDepth, totalVisited];
    }
    visited.add(currentPuzzle);
    let children = getPuzzleChildren(currentPuzzle);
    if (g[currentPuzzle] > maxDepth) {
      maxDepth = g[currentPuzzle];
    }
    totalVisited++;
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      if (visited.has(child)) {
        continue;
      }
      let newG = g[currentPuzzle] + 1;
      if (!g[child] || newG < g[child]) {
        parent[child] = currentPuzzle;
        g[child] = newG;
        f[child] = newG + heuristic(child);
        q.push(child, f[child]);
      }
    }
  }
  console.log("Max depth reached:", maxDepth);
  console.log("Total puzzles visited:", totalVisited);
  return null;
}

async function best_first_search(
  heuristic,
  puzzle,
  targetPuzzle = "12345678-"
) {
  let q = new priorityQueue();
  let visited = new Set();
  let parent = {};
  let f = {};
  let maxDepth = 0;
  let totalVisited = 0;
  q.push(puzzle, 0);
  f[puzzle] = heuristic(puzzle);
  while (q.length > 0) {
    let currentPuzzle = q.pop();
    if (currentPuzzle == targetPuzzle) {
      let path = [];
      while (currentPuzzle != puzzle) {
        path.push(currentPuzzle);
        currentPuzzle = parent[currentPuzzle];
      }
      path.push(puzzle);
      path.reverse();
      console.log("Max depth reached:", maxDepth);
      console.log("Total puzzles visited:", totalVisited);
      return [path, maxDepth, totalVisited];
    }
    visited.add(currentPuzzle);
    let children = getPuzzleChildren(currentPuzzle);
    if (parent[currentPuzzle] && parent[currentPuzzle] != puzzle) {
      totalVisited++;
    }
    if (parent[currentPuzzle] && f[parent[currentPuzzle]] > maxDepth) {
      maxDepth = f[parent[currentPuzzle]];
    }
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      if (visited.has(child)) {
        continue;
      }
      parent[child] = currentPuzzle;
      f[child] = heuristic(child);
      q.push(child, f[child]);
    }
  }
  console.log("Max depth reached:", maxDepth);
  console.log("Total puzzles visited:", totalVisited);
  return null;
}

async function breadth_first_search(_ = 0, puzzle, targetPuzzle = "12345678-") {
  let q = [];
  q.push([puzzle]);
  let visited = new Set();
  let maxDepth = 0;
  let totalVisited = 0;
  while (q.length > 0) {
    let currentPath = q.shift();
    let currentPuzzle = currentPath[currentPath.length - 1];
    if (currentPuzzle == targetPuzzle) {
      console.log(`Max depth: ${maxDepth}`);
      console.log(`Total visited: ${totalVisited}`);
      return [currentPath, maxDepth, totalVisited];
    }
    visited.add(currentPuzzle);
    totalVisited++;
    let children = getPuzzleChildren(currentPuzzle);
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      if (visited.has(child)) {
        continue;
      }
      let newPath = currentPath.slice();
      newPath.push(child);
      q.push(newPath);
    }
    if (currentPath.length > maxDepth) {
      maxDepth = currentPath.length;
    }
  }
  console.log(`Max depth: ${maxDepth}`);
  console.log(`Total visited: ${totalVisited}`);
  return null;
}
