let moves = require("./moves");

const DEPTH = 5;

let fakeStorage = {
    _data: {},

    setItem: function (id, val) {
        return this._data[id] = String(val);
    },

    getItem: function (id) {
        return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
    },

    removeItem: function (id) {
        return delete this._data[id];
    },

    clear: function () {
        return this._data = {};
    }
};

class Tile {
    constructor(position, value) {
        this.x = position.x;
        this.y = position.y;
        this.value = value || 2;

        this.previousPosition = null;
        this.mergedFrom = null; // Tracks tiles that merged together
    }

    savePosition() {
        this.previousPosition = { x: this.x, y: this.y };
    };

    updatePosition(position) {
        this.x = position.x;
        this.y = position.y;
    };

    serialize() {
        return {
            position: {
                x: this.x,
                y: this.y
            },
            value: this.value
        };
    };
}



class Grid {
    constructor(size, previousState) {
        this.size = size;
        this.cells = previousState ? this.fromState(previousState) : this.empty();
    }

    // Build a grid of the specified size
    empty() {
        let cells = [];
        for (let x = 0; x < this.size; x++) {
            let row = cells[x] = [];
            for (let y = 0; y < this.size; y++) {
                row.push(null);
            }
        }
        return cells;
    };

    fromState(state) {
        let cells = [];
        for (let x = 0; x < this.size; x++) {
            let row = cells[x] = [];
            for (let y = 0; y < this.size; y++) {
                let tile = state[x][y];
                row.push(tile ? new Tile(tile.position, tile.value) : null);
            }
        }
        return cells;
    };

    // Find the first available random position
    randomAvailableCell() {
        let cells = this.availableCells();
        if (cells.length) {
            return cells[Math.floor(Math.random() * cells.length)];
        }
    };

    availableCells() {
        let cells = [];
        this.eachCell(function (x, y, tile) {
            if (!tile) {
                cells.push({ x: x, y: y });
            }
        });
        return cells;
    };

    // Call callback for every cell
    eachCell(callback) {
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                callback(x, y, this.cells[x][y]);
            }
        }
    };

    // Check if there are any cells available
    cellsAvailable() {
        return !!this.availableCells().length;
    };

    // Check if the specified cell is taken
    cellAvailable(cell) {
        return !this.cellOccupied(cell);
    };

    cellOccupied(cell) {
        return !!this.cellContent(cell);
    };

    cellContent(cell) {
        if (this.withinBounds(cell)) {
            return this.cells[cell.x][cell.y];
        }
        else {
            return null;
        }
    };

    // Inserts a tile at its position
    insertTile(tile) {
        this.cells[tile.x][tile.y] = tile;
    };

    removeTile(tile) {
        this.cells[tile.x][tile.y] = null;
    };

    withinBounds(position) {
        return position.x >= 0 && position.x < this.size &&
            position.y >= 0 && position.y < this.size;
    };

    serialize() {
        let cellState = [];
        for (let x = 0; x < this.size; x++) {
            let row = cellState[x] = [];
            for (let y = 0; y < this.size; y++) {
                row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
            }
        }
        return { size: this.size, cells: cellState };
    };

    clone() {
        let s = this.serialize();
        return new Grid(s.size, s.cells);
    };

}

class GameController {
    constructor(grid) {
        if (grid) {
            this.size = grid.size;
            this.grid = grid;
        }
    }

    // Return true if the game is lost
    isGameTerminated() {
        if (this.over) {
            return true;
        } else {
            return false;
        }
    };

    // Save all tile positions and remove merger info
    prepareTiles() {
        this.grid.eachCell(function (x, y, tile) {
            if (tile) {
                tile.mergedFrom = null;
                tile.savePosition();
            }
        });
    };

    // Move a tile and its representation
    moveTile(tile, cell) {
        this.grid.cells[tile.x][tile.y] = null;
        this.grid.cells[cell.x][cell.y] = tile;
        tile.updatePosition(cell);
    };

    // Move tiles on the grid in the specified direction
    moveTiles(direction) {
        // 0: up, 1: right, 2: down, 3: left
        let self = this;

        if (this.isGameTerminated()) return; // Don't do anything if the game's over

        let cell, tile;

        let vector = this.getVector(direction);
        let traversals = this.buildTraversals(vector);
        let moved = false;

        // Save the current tile positions and remove merger information
        this.prepareTiles();

        // Traverse the grid in the right direction and move tiles
        traversals.x.forEach(function (x) {
            traversals.y.forEach(function (y) {
                cell = { x: x, y: y };
                tile = self.grid.cellContent(cell);

                if (tile) {
                    let positions = self.findFarthestPosition(cell, vector);
                    let next = self.grid.cellContent(positions.next);

                    // Only one merger per row traversal?
                    if (next && next.value === tile.value && !next.mergedFrom) {
                        let merged = new Tile(positions.next, tile.value * 2);
                        merged.mergedFrom = [tile, next];

                        self.grid.insertTile(merged);
                        self.grid.removeTile(tile);

                        // Converge the two tiles' positions
                        tile.updatePosition(positions.next);

                        // Update the score
                        self.score += merged.value;
                    } else {
                        self.moveTile(tile, positions.farthest);
                    }

                    if (!self.positionsEqual(cell, tile)) {
                        moved = true; // The tile moved from its original cell!
                    }
                }
            });
        });
        return moved;
    }

    // Determine whether a move is available
    moveAvailable(direction) {
        // 0: up, 1: right, 2: down, 3: left
        let tile;
        let vector = this.getVector(direction);
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                tile = this.grid.cellContent({ x: x, y: y });

                if (tile) {
                    let cell = { x: x + vector.x, y: y + vector.y };
                    if (!this.grid.withinBounds(cell))
                        continue;

                    let otherTile = this.grid.cellContent(cell);

                    // The current tile can be moved if the cell is empty or has the same value.
                    if (!otherTile || otherTile.value === tile.value) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    // Adds a tile to the grid
    addTile(tile) {
        this.grid.insertTile(tile);
        if (!this.movesAvailable()) {
            this.over = true; // Game over!
        }
    };

    // Get the vector representing the chosen direction
    getVector(direction) {
        // Vectors representing tile movement
        let map = {
            0: { x: 0, y: -1 }, // Up
            1: { x: 1, y: 0 },  // Right
            2: { x: 0, y: 1 },  // Down
            3: { x: -1, y: 0 }   // Left
        };

        return map[direction];
    };

    // Build a list of positions to traverse in the right order
    buildTraversals(vector) {
        let traversals = { x: [], y: [] };

        for (let pos = 0; pos < this.size; pos++) {
            traversals.x.push(pos);
            traversals.y.push(pos);
        }

        // Always traverse from the farthest cell in the chosen direction
        if (vector.x === 1) traversals.x = traversals.x.reverse();
        if (vector.y === 1) traversals.y = traversals.y.reverse();

        return traversals;
    };

    findFarthestPosition(cell, vector) {
        let previous;

        // Progress towards the vector direction until an obstacle is found
        do {
            previous = cell;
            cell = { x: previous.x + vector.x, y: previous.y + vector.y };
        } while (this.grid.withinBounds(cell) &&
            this.grid.cellAvailable(cell));

        return {
            farthest: previous,
            next: cell // Used to check if a merge is required
        };
    };

    movesAvailable() {
        return this.grid.cellsAvailable() || this.tileMatchesAvailable();
    };

    // Check for available matches between tiles (more expensive check)
    tileMatchesAvailable() {
        let self = this;

        let tile;

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                tile = this.grid.cellContent({ x: x, y: y });

                if (tile) {
                    for (let direction = 0; direction < 4; direction++) {
                        let vector = self.getVector(direction);
                        let cell = { x: x + vector.x, y: y + vector.y };

                        let other = self.grid.cellContent(cell);

                        if (other && other.value === tile.value) {
                            return true; // These two tiles can be merged
                        }
                    }
                }
            }
        }

        return false;
    };

    positionsEqual(first, second) {
        return first.x === second.x && first.y === second.y;
    };
}


class GameManager extends GameController {
    constructor(size, InputManager, Actuator, StorageManager) {
        super(new Grid(size));
        this.size = size; // Size of the grid
        this.storageManager = StorageManager;
        // this.inputManager = new InputManager;
        // this.actuator = new Actuator;

        this.startTiles = 2;
        this.lastDirection = 0;

        // this.inputManager.on("move", this.move.bind(this));
        // this.inputManager.on("restart", this.restart.bind(this));
        // this.inputManager.game = this;

        this.setup();
    }

    // Restart the game
    restart() {
        this.storageManager.clearGameState();
        this.actuator.continueGame(); // Clear the game won/lost message
        this.setup();
    };


    // Set up the game
    setup() {
        let previousState = this.storageManager.getGameState();

        //this.actuator.rebuildGrid(this.size);
        // Reload the game from a previous game if present
        if (previousState) {
            this.grid = new Grid(previousState.grid.size,
                previousState.grid.cells); // Reload grid
            this.score = previousState.score;
            this.over = previousState.over;
        } else {
            this.grid = new Grid(this.size);
            this.score = 0;
            this.over = false;

            // Add the initial tiles
            this.addStartTiles();
        }

        // Update the actuator
        this.actuate();
    };

    // Set up the initial tiles to start the game with
    addStartTiles() {
        for (let i = 0; i < this.startTiles; i++) {
            this.addRandomTile();
        }
    };

    // Adds a tile in a random position
    addRandomTile() {
        if (this.grid.cellsAvailable()) {
            let value = Math.random() < 0.9 ? 2 : 4;
            let tile = new Tile(this.grid.randomAvailableCell(), value);

            this.addTile(tile);
        }
    };

    // Adds a tile in (hopefully) the worst position possible
    addEvilTile() {
        let self = this;
        if (this.grid.cellsAvailable()) {
            // Strategy: place the new tile along the edge of the last direction the player pressed.
            // This forces the player to press a different direction.
            // Also, place the new tile next to the largest number possible.
            let vector = this.getVector(this.lastDirection);
            // Flip the direction
            vector.x *= -1;
            vector.y *= -1;

            // Build an array next available cells in the direction specified.
            let cellOptions = [];
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    let cell = { x: 0, y: 0 };
                    if (vector.x == 1)
                        cell.x = j;
                    else if (vector.x == -1)
                        cell.x = this.size - j - 1;
                    else
                        cell.x = i;
                    if (vector.y == 1)
                        cell.y = j;
                    else if (vector.y == -1)
                        cell.y = this.size - j - 1;
                    else
                        cell.y = i;
                    if (this.grid.cellAvailable(cell)) {
                        cellOptions.push(cell);
                        break;
                    }
                }
            }
            // Find the available cell with the best score
            let bestScore = 0;
            let winners = [];
            let maxTileValue = Math.pow(2, this.size * this.size);
            for (i = 0; i < cellOptions.length; i++) {
                // Look at the surrounding cells
                let minValue = maxTileValue;
                for (let direction = 0; direction < 4; direction++) {
                    let adjVector = this.getVector(direction);
                    let adjCell = {
                        x: cellOptions[i].x + adjVector.x,
                        y: cellOptions[i].y + adjVector.y
                    };
                    let adjTile = this.grid.cellContent(adjCell);
                    if (adjTile) {
                        minValue = Math.min(minValue, adjTile.value);
                    }
                }
                if (minValue > bestScore) {
                    winners = [];
                    bestScore = minValue;
                }
                if (minValue >= bestScore) {
                    winners.push(cellOptions[i]);
                }
            }
            if (winners.length) {
                let winnerIndex = Math.floor(Math.random() * winners.length);
                let value = (bestScore != 2 ? 2 : 4);
                let tile = new Tile(winners[winnerIndex], value);
                this.addTile(tile);
            }
        }
    };

    // generateTile = addRandomTile;

    // Sends the updated grid to the actuator
    actuate() {
        if (this.storageManager.getBestScore() < this.score) {
            this.storageManager.setBestScore(this.score);
        }

        // Clear the state when the game is over (game over only, not win)
        if (this.over) {
            this.storageManager.clearGameState();
        } else {
            this.storageManager.setGameState(this.serialize());
        }

        // this.actuator.actuate(this.grid, {
        //     score: this.score,
        //     over: this.over,
        //     bestScore: this.storageManager.getBestScore(),
        //     terminated: this.isGameTerminated()
        // });

    };

    // Represent the current game as an object
    serialize() {
        return {
            grid: this.grid.serialize(),
            score: this.score,
            over: this.over
        };
    };

    // Move tiles on the grid in the specified direction
    move(direction) {
        // 0: up, 1: right, 2: down, 3: left
        let moved = this.moveTiles(direction);

        if (moved) {
            this.lastDirection = direction;
            this.addRandomTile();
            this.actuate();
        }
    };

}

class SmartAI {
    constructor(game) {
        this.game = game;
    }

    nextMove() {
        // Plan ahead a few moves in every direction and analyze the board state.
        // Go for moves that put the board in a better state.
        let originalQuality = this.gridQuality(this.game.grid);
        let results = this.planAhead(this.game.grid, DEPTH, originalQuality);
        // Choose the best result
        let bestResult = this.chooseBestMove(results, originalQuality);
        // console.log("Score: ", this.game.score);
        return bestResult.direction;
    };

    // Plans a few moves ahead and returns the worst-case scenario grid quality,
    // and the probability of that occurring, for each move
    planAhead(grid, numMoves, originalQuality) {
        let results = new Array(4);

        // Try each move and see what happens.
        for (let d = 0; d < 4; d++) {
            // Work with a clone so we don't modify the original grid.
            let testGrid = grid.clone();
            let testGame = new GameController(testGrid);
            let moved = testGame.moveTiles(d);
            if (!moved) {
                results[d] = null;
                continue;
            }
            // Spawn a 2 in all possible locations.
            let result = {
                quality: -1,    // Quality of the grid
                probability: 1, // Probability that the above quality will happen
                qualityLoss: 0, // Sum of the amount that the quality will have decreased multiplied by the probability of the decrease
                direction: d
            };
            let availableCells = testGrid.availableCells();
            for (let i = 0; i < availableCells.length; i++) {
                // Assume that the worst spawn location is adjacent to an existing tile,
                // and only test cells that are adjacent to a tile.
                let hasAdjacentTile = false;
                for (let d2 = 0; d2 < 4; d2++) {
                    let vector = testGame.getVector(d2);
                    let adjCell = {
                        x: availableCells[i].x + vector.x,
                        y: availableCells[i].y + vector.y,
                    };
                    if (testGrid.cellContent(adjCell)) {
                        hasAdjacentTile = true;
                        break;
                    }
                }
                if (!hasAdjacentTile)
                    continue;

                let testGrid2 = testGrid.clone();
                let testGame2 = new GameController(testGrid2);
                testGame2.addTile(new Tile(availableCells[i], 2));
                let tileResult;
                if (numMoves > 1) {
                    let subResults = this.planAhead(testGrid2, numMoves - 1, originalQuality);
                    // Choose the sub-result with the BEST quality since that is the direction
                    // that would be chosen in that case.
                    tileResult = this.chooseBestMove(subResults, originalQuality);
                } else {
                    let tileQuality = this.gridQuality(testGrid2);
                    tileResult = {
                        quality: tileQuality,
                        probability: 1,
                        qualityLoss: Math.max(originalQuality - tileQuality, 0)
                    };
                }
                // Compare this grid quality to the grid quality for other tile spawn locations.
                // Take the WORST quality since we have no control over where the tile spawns,
                // so assume the worst case scenario.
                if (result.quality == -1 || tileResult.quality < result.quality) {
                    result.quality = tileResult.quality;
                    result.probability = tileResult.probability / availableCells.length;
                } else if (tileResult.quality == result.quality) {
                    result.probability += tileResult.probability / availableCells.length;
                }
                result.qualityLoss += tileResult.qualityLoss / availableCells.length;
            }
            results[d] = result;
        }
        return results;
    }

    chooseBestMove(results, originalQuality) {
        // Choose the move with the least probability of decreasing the grid quality.
        // If multiple results have the same probability, choose the one with the best quality.
        let bestResult;
        for (let i = 0; i < results.length; i++) {
            if (results[i] == null)
                continue;
            if (!bestResult ||
                results[i].qualityLoss < bestResult.qualityLoss ||
                (results[i].qualityLoss == bestResult.qualityLoss && results[i].quality > bestResult.quality) ||
                (results[i].qualityLoss == bestResult.qualityLoss && results[i].quality == bestResult.quality && results[i].probability < bestResult.probability)) {
                bestResult = results[i];
            }
        }
        if (!bestResult) {
            bestResult = {
                quality: -1,
                probability: 1,
                qualityLoss: originalQuality,
                direction: 0
            };
        }
        return bestResult;
    }

    // Gets the quality of the current state of the grid
    gridQuality(grid) {
        // Look at monotonicity of each row and column and sum up the scores.
        let monoScore = 0; // monoticity score
        let traversals = this.game.buildTraversals({ x: -1, y: 0 });
        let prevValue = -1;
        let incScore = 0, decScore = 0;

        let scoreCell = function (cell) {
            let tile = grid.cellContent(cell);
            let tileValue = (tile ? tile.value : 0);
            incScore += tileValue;
            if (tileValue <= prevValue || prevValue == -1) {
                decScore += tileValue;
                if (tileValue < prevValue) {
                    incScore -= prevValue;
                }
            }
            prevValue = tileValue;
        };

        // Traverse each column
        traversals.x.forEach(function (x) {
            prevValue = -1;
            incScore = 0;
            decScore = 0;
            traversals.y.forEach(function (y) {
                scoreCell({ x: x, y: y });
            });
            monoScore += Math.max(incScore, decScore);
        });
        // Traverse each row
        traversals.y.forEach(function (y) {
            prevValue = -1;
            incScore = 0;
            decScore = 0;
            traversals.x.forEach(function (x) {
                scoreCell({ x: x, y: y });
            });
            monoScore += Math.max(incScore, decScore);
        });

        // Now look at number of empty cells. More empty cells = better.
        let availableCells = grid.availableCells();
        let emptyCellWeight = 8;
        let emptyScore = availableCells.length * emptyCellWeight;

        let score = monoScore + emptyScore;
        return score;
    }
}

class LocalStorageManager {
    constructor() {
        this.bestScoreKey = "bestScore";
        this.gameStateKey = "gameState";

        // let supported = this.localStorageSupported();
        this.storage = fakeStorage;
    }
    localStorageSupported() {
        let testKey = "test";
        let storage = window.localStorage;

        try {
            storage.setItem(testKey, "1");
            storage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    };


    getBestScore() {
        return this.storage.getItem(this.bestScoreKey) || 0;
    };

    setBestScore(score) {
        this.storage.setItem(this.bestScoreKey, score);
    };

    // Game state getters/setters and clearing
    getGameState() {
        let stateJSON = this.storage.getItem(this.gameStateKey);
        return stateJSON ? JSON.parse(stateJSON) : null;
    };

    setGameState(gameState) {
        this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
    };

    clearGameState() {
        this.storage.removeItem(this.gameStateKey);
    };
}


function molder(input) {
    let cells = [];
    for (let i = 0; i < 4; i++) {
        let newrow = [];
        for (let j = 0; j < 4; j++) {
            if (input[i][j] != 0) {
                let obj = {
                    position: {
                        x: i,
                        y: j,
                    },
                    value: input[i][j]
                };
                newrow.push(obj);
            }
            else {
                newrow.push(null);
            }
        }
        cells.push(newrow);
    }
    return cells;
}

function printer(input) {
    for (let i = 0; i < 4; i++) {
        let newrow = "";
        for (let j = 0; j < 4; j++) {
            newrow += input[i][j] + ' ';
        }
        console.log(newrow);
    }
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

function cloneGrid(grid) {
    return grid.map(row => row.slice());
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

// function arraysEqual(arr1, arr2) {
//     // Check if both arrays have the same length
//     // if (arr1.length !== arr2.length) return false;

//     for (let i = 0; i < arr1.length; i++) {
//         // Check if both inner arrays have the same length
//         // if (arr1[i].length !== arr2[i].length) return false;

//         // Compare each element inside the inner arrays
//         for (let j = 0; j < arr1[i].length; j++) {
//             if (arr1[i][j] !== arr2[i][j]) {
//                 return false;
//             }
//         }
//     }
//     return true;
// }

// let currentState = [
//     [{ position: { x: 0, y: 0 }, value: 2 }, null, null, null],
//     [null, { position: { x: 1, y: 1 }, value: 2 }, null, null],
//     [null, null, null, null],
//     [null, null, null, null]
// ];

function testBestMoveFunction() {
    let input = [
        [2, 0, 0, 0],
        [0, 0, 0, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]
    // let input = [
    //     [4, 128, 16, 4],
    //     [2, 32, 8, 2],
    //     [16, 64, 4, 16],
    //     [8, 16, 2, 4]
    // ]

    // call
    let limit = 100;
    while (limit--) {
        let currentState = molder(input);
        printer(input);
        let storageManager = new LocalStorageManager();
        storageManager.setGameState({ grid: { size: 4, cells: currentState }, score: 0, over: 0 });

        let gameManager = new GameManager(4, null, null, storageManager);
        let smartAI = new SmartAI(gameManager);
        let output = smartAI.nextMove();
        console.log("Best Move: " + output + "\n");
        if (output == 0) {
            input = moves.moveUp(input);
        }
        else if (output == 1) {
            input = moves.moveRight(input)
        }
        else if (output == 2) {
            input = moves.moveDown(input);
        }
        else if (output == 3) {
            input = moves.moveLeft(input);
        }
        else {
            console.log("Output was not a direction. Output: " + output);
            break;
        }
        input = addRandomTile(input);
    }
}

exports.GetBestMove = (input) => {
    let currentState = molder(input);
    let storageManager = new LocalStorageManager();
    storageManager.setGameState({ grid: { size: 4, cells: currentState }, score: 0, over: 0 });
    let gameManager = new GameManager(4, null, null, storageManager);
    let smartAI = new SmartAI(gameManager);
    let output = smartAI.nextMove();
    return output;
}