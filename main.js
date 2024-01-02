const express = require("express");
const app = express();
const port = 80;

app.use(express.static("public"));

app.get("*", (req, res) => {
    res.status(404).end();
});

app.listen(port, () => {
    console.log("asset server started on port " + port);
});

