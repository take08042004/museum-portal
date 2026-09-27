// ---------------------------------------------------------------------------
// Procedural maze generation + solving. Pure algorithms, no THREE.js or DOM
// dependency, so they're easy to test or reuse on their own.
// ---------------------------------------------------------------------------

// randomized perfect maze via iterative recursive backtracker (guarantees a
// single unique solution path between any two cells, and no closed loops)
export function generateMazeCells(size) {
  const cells = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) row.push({ N: true, S: true, E: true, W: true, visited: false });
    cells.push(row);
  }
  const stack = [[0, 0]];
  cells[0][0].visited = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const neighbors = [];
    if (y > 0 && !cells[y - 1][x].visited) neighbors.push([x, y - 1, "N", "S"]);
    if (y < size - 1 && !cells[y + 1][x].visited) neighbors.push([x, y + 1, "S", "N"]);
    if (x > 0 && !cells[y][x - 1].visited) neighbors.push([x - 1, y, "W", "E"]);
    if (x < size - 1 && !cells[y][x + 1].visited) neighbors.push([x + 1, y, "E", "W"]);
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const [nx, ny, a, b] = neighbors[Math.floor(Math.random() * neighbors.length)];
    cells[y][x][a] = false;
    cells[ny][nx][b] = false;
    cells[ny][nx].visited = true;
    stack.push([nx, ny]);
  }
  return cells;
}

// breadth-first search for the (unique) path from start to end, used to lay
// down the glowing guide-line once the maze's altar has been calmed
export function solveMazePath(cells, start, end) {
  const size = cells.length;
  const inBounds = (x, y) => x >= 0 && x < size && y >= 0 && y < size;
  const key = (x, y) => `${x},${y}`;
  const queue = [start];
  const cameFrom = new Map([[key(...start), null]]);
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === end[0] && y === end[1]) break;
    const cell = cells[y][x];
    const moves = [];
    if (!cell.N) moves.push([x, y - 1]);
    if (!cell.S) moves.push([x, y + 1]);
    if (!cell.E) moves.push([x + 1, y]);
    if (!cell.W) moves.push([x - 1, y]);
    for (const [nx, ny] of moves) {
      if (inBounds(nx, ny) && !cameFrom.has(key(nx, ny))) {
        cameFrom.set(key(nx, ny), [x, y]);
        queue.push([nx, ny]);
      }
    }
  }
  const path = [];
  let cur = end;
  while (cur) {
    path.unshift(cur);
    cur = cameFrom.get(key(...cur));
  }
  return path;
}
