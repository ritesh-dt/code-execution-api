const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config();

const { decode } = require("./utils/base64");
const { CheckOutput } = require("./code_execution");

const app = express();

let jsonParser = bodyParser.json();
app.use(jsonParser);

const JUDGE0_SERVER = process.env.JUDGE0_SERVER;
const SERVER_URL = process.env.SERVER_URL;
const CALLBACK_RETRY = process.env.CALLBACK_RETRY || 3;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


const getExpectedOutput = async (token) => {
    const url = JUDGE0_SERVER + "/submissions/" + token + "?fields=expected_output";
    
    let response = await fetch(url);
    return await response.json();
}

const sendCallback = async (body) => {
    const headers = {
        'Content-Type': 'application/json'
    }

    let response = await fetch(SERVER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    
    return response.status == 200;
}

app.get('/', (req, res) => {
    res.send('Judge0 callbacks at /check!');
})

app.put('/check', async (req, res) => {
    // Coding Classroom details
    let submissionId = req.query["submissionId"];
    let testCaseIndex = req.query["testCaseIndex"];
    
    // console.log(submissionId, testCaseIndex);
    // console.log(req.connection.remoteAddress, req.headers['x-forwarded-for']);
    
    if (!submissionId || !testCaseIndex) {
        res.status(404);
        res.send({
            "message": "Submission id and test case index not found"
        });
        return;
    }
    
    let result = req.body;
    
    let output;
    if (result["status"])
        output = decode(result["stdout"]);
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
    
    console.log(response);
    
    let callback_count = 0;
    let success = false;
    while (callback_count < CALLBACK_RETRY) {
        let callback = await sendCallback(response);
        if (callback) {
            success = true;
            break;
        }
        
        callback_count += 1;
    }
    
    if (success)
        res.sendStatus(200);
    else
        res.sendStatus(500);
    return;
})

const port = process.env.PORT || 9051;
app.listen(port, () => {
    console.log(`Judge0 callbacks listening on port ${port}`);
})
