// expectimax.js

const { moveUp, moveDown, moveLeft, moveRight, gridsAreEqual } = require('./moves');
const { evaluateGrid } = require('./heuristics');
const { cloneGrid, getEmptyCells } = require('./grid');

function expectimax(grid, depth, playerTurn = true) {
    if (depth === 0 || isGameOver(grid)) {
        return { score: evaluateGrid(grid), move: null };
    }

    if (playerTurn) {
        let maxScore = -Infinity;
        let bestMove = null;

        const moves = [
            { func: moveUp, name: 'up' },
            { func: moveDown, name: 'down' },
            { func: moveLeft, name: 'left' },
            { func: moveRight, name: 'right' },
        ];

        for (let move of moves) {
            const newGrid = move.func(grid);
            if (gridsAreEqual(grid, newGrid)) {
                continue; // Skip if move doesn't change the grid
            }

            const result = expectimax(newGrid, depth - 1, false);
            if (result.score > maxScore) {
                maxScore = result.score;
                bestMove = move.name;
            }
        }

        return { score: maxScore, move: bestMove };
    } else {
        const emptyCells = getEmptyCells(grid);
        let totalScore = 0;
        let possibleTiles = [];

        for (let cell of emptyCells) {
            // Probability 0.9 for tile 2
            possibleTiles.push({ x: cell.x, y: cell.y, value: 2, probability: 0.9 });
            // Probability 0.1 for tile 4
            possibleTiles.push({ x: cell.x, y: cell.y, value: 4, probability: 0.1 });
        }

        for (let tile of possibleTiles) {
            const newGrid = cloneGrid(grid);
            newGrid[tile.x][tile.y] = tile.value;

            const result = expectimax(newGrid, depth - 1, true);
            totalScore += result.score * tile.probability;
        }

        const averageScore = totalScore / possibleTiles.length;
        return { score: averageScore, move: null };
    }
}

function isGameOver(grid) {
    if (getEmptyCells(grid).length > 0) return false;

    const moves = [moveUp, moveDown, moveLeft, moveRight];
    for (let move of moves) {
        const newGrid = move(grid);
        if (!gridsAreEqual(grid, newGrid)) {
            return false;
        }
    }
    return true;
}

module.exports = { expectimax };
