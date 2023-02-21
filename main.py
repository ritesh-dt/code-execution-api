import asyncio
import aiohttp
import re
import time
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

PRECISION = 5

# Regular Expressions
trim_left = re.compile(r"^[\.]+")
trim_right = re.compile(r"[\.]+$")

class TestCase(BaseModel):
    id: int
    input_case: str
    output_case: str

class Submission(BaseModel):
    code: str
    language: str
    test_cases: List[TestCase]

class ResultTestCase(BaseModel):
    solved: bool
    output: str

class Result(BaseModel):
    result: int
    test_cases: List[ResultTestCase]

@app.get("/")
def home():
    return {"message": "Code execution API working!"}

url = "https://emkc.org/api/v2/piston/execute"

headers = {
    "Content-Type": "application/json"
}
supported_languages = {
    "C (GCC 10.2.0)": "c",
    "C++": "c++",
    "Python 3 (3.10.0)": "python",
    "Java (15.0.2)": "java"
}
versionIds = {
    "C (GCC 10.2.0)": "10.2.0",
    "C++": "10.2.0",
    "Python 3 (3.10.0)": "3.10.0",
    "Java (15.0.2)": "15.0.2"
}

@app.post("/check")
async def check(submission: Submission) -> Result:
        
    results = {
        "result": 0,
        "test_cases": []
    }

    body = {
        "language": supported_languages[submission.language],
        "version": versionIds[submission.language],
        "files": [{
                "content": submission.code
            }],
        "stdin": "",
        "args": [],
        "compile_timeout": 10000,
        "run_timeout": 3000,
        "compile_memory_limit": -1,
        "run_memory_limit": -1
    }

    call_piston_time = time.time()
    
    loop = asyncio.get_event_loop()
    piston_tasks = []
    
    for test_case in submission.test_cases:
        stdin = test_case.input_case
        stdout = test_case.output_case

        body["stdin"] = stdin

        piston_task = loop.create_task(CallPiston(url, headers, body, stdin, stdout))
        piston_tasks.append(piston_task)
        if supported_languages[submission.language] == "java":
            await asyncio.sleep(1.6)
        else:
            await asyncio.sleep(0.4)
    
    for task in piston_tasks:
        await task
    
    for task in piston_tasks:
        task_result = task.result()
        results["result"] += task_result["result"]
        results["test_cases"].append(task_result["test_case"])
    
    print("--- piston api time: %s seconds ---" % (time.time() - call_piston_time))
    print(results)
    
    return results


async def CallPiston(url, headers, body, stdin, stdout):
    
    result = {
        "result": 0,
        "test_case": None
    }
    
    body["stdin"] = stdin
    
    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.post(url, json=body) as response:
            # response = requests.post(url, json=body, headers=headers)
            statusCode = response.status
            response = await response.json()
            
            if statusCode == 200:
                # print(statusCode, response)
                # print(stdout)
                
                if "compile" in response and response["compile"]["stderr"]:
                    result["test_case"] = {
                        "solved": False,
                        "output": response["compile"]["stderr"]
                    }
                # elif response["run"]["signal"] == "SIGKILL":
                #     print("SIGKILL status, calling Piston again")
                    # await asyncio.sleep(1)
                    # return await CallPiston(url, headers, body, stdin, stdout)
                elif response["run"]["stderr"]:
                    result["test_case"] = {
                        "solved": False,
                        "output": response["run"]["stderr"]
                    }
                elif check_output(response["run"]["stdout"], stdout):
                    result["test_case"] = {
                        "solved": True,
                        "output": response["run"]["stdout"]
                    }
                    result["result"] = 1
                else:
                    result["test_case"] = {
                        "solved": False,
                        "output": response["run"]["stdout"]
                    }
            elif statusCode == 400:
                print("Error while code execution API:", response["message"])
                result["test_case"] = {
                    "solved": False,
                    "output": response["message"]
                }
            elif statusCode == 429:
                print("429 status, calling Piston again")
                await asyncio.sleep(1)
                return await CallPiston(url, headers, body, stdin, stdout)
            else:
                print(statusCode, response)
            
    return result
    
def check_output(output, output_test_case):
    output_values = []
    for line in output.strip().split("\n"):
        line = re.sub("\s\s+", " ", line)
        line = line.replace(",", "")
    
        if not line:
            continue
        for value in line.split(" "):
            value = trim_left.sub("", value)
            # re.sub("^[\.]+", "", value)
            value = trim_right.sub("", value)
            # re.sub("[\.]+$", "", value)
            
            if not value:
                continue
            
            try:
                float(value)
                num_value = round(float(value), PRECISION)
                output_values.append(num_value)
            except ValueError:
                text_value = value.lower()
                output_values.append(text_value)

    expected_values = []
    for line in output_test_case.strip().split("\n"):
        line = re.sub("\s\s+", " ", line)
        line = line.replace(",", "")
        
        if not line:
            continue
        for value in line.split(" "):
            value = trim_left.sub("", value)
            # re.sub("^[\.]+", "", value)
            value = trim_right.sub("", value)
            # re.sub("[\.]+$", "", value)
            
            if not value:
                continue
            
            try:
                float(value)
                num_value = round(float(value), PRECISION)
                expected_values.append(num_value)
            except ValueError:
                text_value = value.lower()
                expected_values.append(text_value)
    
    if len(output_values) != len(expected_values):
        return False

    for val1, val2 in zip(output_values, expected_values):
        if not val1 == val2 and not str(val1) == str(val2):
            return False

    return True
