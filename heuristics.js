// heuristics.js

function evaluateGrid(grid) {
    const emptyCells = getEmptyCellCount(grid);
    const monotonicity = calculateMonotonicity(grid);
    const smoothness = calculateSmoothness(grid);
    const maxTile = getMaxTile(grid);

    // Weights for different heuristics
    const emptyWeight = 270.0;
    const monoWeight = 47.0;
    const smoothWeight = 0.1;
    const maxTileWeight = 100.0;

    const score =
        (emptyCells * emptyWeight) +
        (monotonicity * monoWeight) -
        (smoothness * smoothWeight) +
        (Math.log2(maxTile) * maxTileWeight);

    return score;
}

function getEmptyCellCount(grid) {
    let count = 0;
    for (let row of grid) {
        for (let cell of row) {
            if (cell === 0) count++;
        }
    }
    return count;
}

function getMaxTile(grid) {
    let max = 0;
    for (let row of grid) {
        for (let cell of row) {
            if (cell > max) max = cell;
        }
    }
    return max;
}

function calculateMonotonicity(grid) {
    let totals = [0, 0, 0, 0];

    // Rows
    for (let x = 0; x < 4; x++) {
        let current = 0;
        let next = 0;
        for (let y = 0; y < 3; y++) {
            current = grid[x][y];
            next = grid[x][y + 1];
            if (current !== 0 && next !== 0) {
                if (current > next) totals[0] += next - current;
                else totals[1] += current - next;
            }
        }
    }

    // Columns
    for (let y = 0; y < 4; y++) {
        let current = 0;
        let next = 0;
        for (let x = 0; x < 3; x++) {
            current = grid[x][y];
            next = grid[x + 1][y];
            if (current !== 0 && next !== 0) {
                if (current > next) totals[2] += next - current;
                else totals[3] += current - next;
            }
        }
    }

    return Math.max(totals[0], totals[1]) + Math.max(totals[2], totals[3]);
}

function calculateSmoothness(grid) {
    let smoothness = 0;

    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            if (grid[x][y] !== 0) {
                const value = Math.log2(grid[x][y]);
                // Check right neighbor
                if (y < 3 && grid[x][y + 1] !== 0) {
                    const target = Math.log2(grid[x][y + 1]);
                    smoothness -= Math.abs(value - target);
                }
                // Check down neighbor
                if (x < 3 && grid[x + 1][y] !== 0) {
                    const target = Math.log2(grid[x + 1][y]);
                    smoothness -= Math.abs(value - target);
                }
            }
        }
    }

    return smoothness;
}

module.exports = { evaluateGrid };
