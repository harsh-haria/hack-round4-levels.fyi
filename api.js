const express = require("express");
const cors = require("cors");

const PORT = process.env.PORT;

const app = express();

app.use(cors({
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
}));

const indexFunctions = require('./index');

app.use('/', (req, res) => {
    let state = req.query.state;
    if (!state) {
        return res.status(400).json({ message: "state input is required." });
    }
    let arrayElements = state.split(',');
    let result = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];

    for (let i = 0; i < arrayElements.length; i++) {
        let row = i % 4;
        let col = Math.floor(i / 4);
        result[row][col] = arrayElements[i];
    }

    let output = indexFunctions.GetBestMove(result);

    return res.send("" + output);
});

app.listen(PORT, () => {
    console.log(`Server Listening on port ${PORT}`);
});