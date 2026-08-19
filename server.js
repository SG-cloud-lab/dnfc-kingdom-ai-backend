const express = require("express");
const fs = require("fs");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log(
    "Gemini key loaded:",
    process.env.GEMINI_API_KEY ? "YES" : "NO"
);

const app = express();

app.use(express.json());

let knowledge = "";

// Load DNFC knowledge library
try {

    knowledge = fs.readFileSync(
        "./knowledge/dnfc-library.txt",
        "utf8"
    );

    console.log("DNFC knowledge loaded successfully");

} catch(error) {

    console.log(
        "Knowledge file error:",
        error.message
    );

}


// Home test route
app.get("/", (req, res) => {

    res.send(
        "DNFC Kingdom AI Backend is running"
    );

});


// AI route
app.post("/ask", async (req, res) => {

    console.log("ASK ROUTE REACHED");


    const question = req.body.question;


    console.log(
        "QUESTION RECEIVED:",
        question
    );


    try {


        const model = genAI.getGenerativeModel({

            model: "gemini-1.5-flash"

        });



        const prompt = `

You are DNFC Kingdom AI.

You answer questions about Jesus Christ,
the Bible, Christian teachings, and spiritual truth.

Use the DNFC Kingdom AI knowledge library below:

${knowledge}


Question:

${question}


Give a clear, biblical, spiritually insightful answer.

`;



        console.log("Sending request to Gemini...");


        const result = await model.generateContent(prompt);


        console.log("Gemini responded successfully");


        const response = result.response.text();



        res.json({

            answer: response

        });



    } catch(error) {


        console.log("FULL GEMINI ERROR:");
        console.log(error);



        res.status(500).json({

            error: "AI service failed",

            details: error.message || "Unknown error"

        });


    }


});


// Render port
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        "DNFC Kingdom AI server running on port " + PORT
    );

});
