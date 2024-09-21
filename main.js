const { expectimax } = require('./expectimax');

function getBestMove(grid) {
    const depth = 3;
    const result = expectimax(grid, depth, true);
    return result;
}

let grid = [
    [0, 2, 0, 2],
    [4, 0, 2, 0],
    [0, 0, 4, 0],
    [2, 0, 0, 2],
];


const bestMove = getBestMove(grid);
console.log(bestMove);
