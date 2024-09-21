function slide(row) {
    const arr = row.filter(val => val);
    const missing = 4 - arr.length;
    const zeros = Array(missing).fill(0);
    return arr.concat(zeros);
}

function combine(row) {
    for (let i = 0; i < 3; i++) {
        if (row[i] !== 0 && row[i] === row[i + 1]) {
            row[i] *= 2;
            row[i + 1] = 0;
        }
    }
    return row;
}

function moveLeft(grid) {
    const newGrid = [];
    for (let i = 0; i < 4; i++) {
        let row = grid[i];
        row = slide(row);
        row = combine(row);
        row = slide(row);
        newGrid.push(row);
    }
    return newGrid;
}

function moveRight(grid) {
    const reversedGrid = grid.map(row => row.reverse());
    const newGrid = moveLeft(reversedGrid);
    return newGrid.map(row => row.reverse());
}

function transpose(grid) {
    return grid[0].map((_, i) => grid.map(row => row[i]));
}

function moveUp(grid) {
    const transposed = transpose(grid);
    const movedGrid = moveLeft(transposed);
    return transpose(movedGrid);
}

function moveDown(grid) {
    const transposed = transpose(grid);
    const movedGrid = moveRight(transposed);
    return transpose(movedGrid);
}

function gridsAreEqual(a, b) {
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            if (a[x][y] !== b[x][y]) return false;
        }
    }
    return true;
}

module.exports = {
    moveLeft,
    moveRight,
    moveUp,
    moveDown,
    gridsAreEqual,
};
