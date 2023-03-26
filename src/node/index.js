const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const { decode } = require("./utils/base64");
const { CheckOutput } = require("./code_execution");

const app = express();

let jsonParser = bodyParser.json();
app.use(jsonParser);

const getExpectedOutput = async (token) => {
    const url = "https://judge.coding-classroom.live/submissions/" + token + "?fields=expected_output";
    
    let response = await fetch(url);
    return await response.json();
}

app.get('/', (req, res) => {
    res.send('Judge0 callbacks at /check!');
})

app.post('/check', async (req, res) => {
    // Coding Classroom details
    let submissionId = req.query["submissionId"];
    let testCaseIndex = req.query["testCaseIndex"];
    
    if (!submissionId || !testCaseIndex) {
        res.status(404);
        res.send({
            "message": "Submission id and test case index not found"
        });
        return;
    }
    
    let result = req.body;
    
    let output = decode(result["stdout"]);
    if (result["status"]["id"] == 11)
        output += "\n" + decode(result["message"]);
    
    let token = result["token"];
    let expectedOutput = await getExpectedOutput(token);
    expectedOutput = expectedOutput["expected_output"];
    
    if (!expectedOutput) {
        res.status(404);
        res.send({
            "message": "Expected output not found for submission"
        });
        return;
    }
    // console.log(output, expectedOutput);
    
    let response = req.query;
    if (CheckOutput(output, expectedOutput)) {
        response["solved"] = true;
    } else {
        response["solved"] = false;
    }
    
    res.status(200);
    res.send(response);
    return;
})

const port = process.env.PORT || 9051;
app.listen(port, () => {
    console.log(`Judge0 callbacks listening on port ${port}`);
})
