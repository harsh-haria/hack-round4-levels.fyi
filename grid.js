function cloneGrid(grid) {
  return grid.map(row => row.slice());
}

function getEmptyCells(grid) {
  const cells = [];
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      if (grid[x][y] === 0) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

function addRandomTile(grid) {
  const emptyCells = getEmptyCells(grid);
  if (emptyCells.length === 0) return grid;

  const index = Math.floor(Math.random() * emptyCells.length);
  const cell = emptyCells[index];
  const value = Math.random() < 0.9 ? 2 : 4;

  const newGrid = cloneGrid(grid);
  newGrid[cell.x][cell.y] = value;
  return newGrid;
}

module.exports = { cloneGrid, getEmptyCells, addRandomTile };
