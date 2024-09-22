const express = require("express");
const cors = require("cors");

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors({
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
}));

const indexFunctions = require('./index');

app.use('/', (req, res) => {
    let max = 0;
    let DEPTH = 5;
    let state = req.query.state;
    if (!state) {
        return res.status(400).json({ message: "state input is required." });
    }
    let arrayElements = state.split(',');
    let result = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];

    for (let i = 0; i < arrayElements.length; i++) {
        if (max < arrayElements[i]) {
            max = arrayElements[i];
            if (arrayElements[i] >= 2048) {
                DEPTH = 6;
            }
            else if (arrayElements[i] >= 4096) {
                DEPTH = 7;
            }
            else if (arrayElements[i] >= 8192) {
                DEPTH = 8;
            }
        }
        let row = i % 4;
        let col = Math.floor(i / 4);
        result[row][col] = arrayElements[i];
    }
    let output = 0;
    try {
        output = indexFunctions.GetBestMove(result, DEPTH);
    } catch (error) {
        console.log('error while getting the best direction for the game.');
        return res.send("" + output);
    }

    return res.send("" + output);
});

app.listen(PORT, () => {
    console.log(`Server Listening on port ${PORT}`);
});