const express = require("express");
const fs = require("fs");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();

app.use(express.json());

let knowledge = "";

try {
    knowledge = fs.readFileSync(
        "./knowledge/dnfc-library.txt",
        "utf8"
    );

    console.log("DNFC knowledge loaded successfully");

} catch (error) {

    console.log("Knowledge file not found:", error.message);

}


// Test route
app.get("/", (req, res) => {

    res.send("DNFC Kingdom AI Backend is running");

});


// AI Question Route
app.post("/ask", async (req, res) => {
console.log("ASK ROUTE REACHED");
    const question = req.body.question;

    if (!question) {

        return res.status(400).json({
            error: "Please provide a question"
        });

    }


    try {

        const model = genAI.getGenerativeModel({

            model: "gemini-1.5-flash"

        });



        const prompt = `

You are DNFC Kingdom AI.

Your purpose is to answer questions about Jesus Christ, Scripture, Christian doctrine, and spiritual truths.

You must use the DNFC Kingdom AI knowledge library below as your primary theological foundation.

Do not mention that you are an AI.
Do not give generic chatbot responses.
Give clear, deep, biblical, spiritually insightful answers.

DNFC KNOWLEDGE LIBRARY:

${knowledge}


USER QUESTION:

${question}


Provide a well explained answer using Scripture and spiritual understanding.

`;



        const result = await model.generateContent(prompt);


        const answer = result.response.text();



        res.json({

            answer: answer

        });



    } catch (error) {


        console.log("GEMINI ERROR:", error);


        res.status(500).json({

            error: "AI service failed",
            details: error.message

        });


    }


});



// Render Port
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        "DNFC Kingdom AI server running on port " + PORT
    );

});
