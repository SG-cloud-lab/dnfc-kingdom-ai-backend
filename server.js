const express = require("express");
const fs = require("fs");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log("Gemini key loaded:", process.env.GEMINI_API_KEY ? "YES" : "NO");

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

    console.log("Knowledge file error:", error.message);

}


// Test route
app.get("/", (req, res) => {

    res.send("DNFC Kingdom AI Backend is running");

});


// AI Route
app.post("/ask", async (req, res) => {

    console.log("ASK ROUTE REACHED");


    const question = req.body.question;


    if (!question) {

        return res.status(400).json({

            error: "Question is required"

        });

    }


    try {


        const model = genAI.getGenerativeModel({

            model: "gemini-1.5-flash"

        });



        const prompt = `

You are DNFC Kingdom AI.

Your purpose is to answer questions about Jesus Christ, Scripture, Christian doctrine, and spiritual truths.

Use the DNFC Kingdom AI knowledge library as your foundation.

Give deep, biblical, clear and spiritually insightful answers.

Do not answer like a simple chatbot.
Do not give programmed responses.

DNFC KNOWLEDGE LIBRARY:

${knowledge}


QUESTION:

${question}


Answer:

`;



        const result = await model.generateContent(prompt);


        const answer = result.response.text();



        res.json({

            answer: answer

        });



    } catch(error) {


        console.log("GEMINI ERROR:", error);


        res.status(500).json({

            error: error.message

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
