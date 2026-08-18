const express = require("express");
const fs = require("fs");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();

app.use(express.json());

let knowledge = "";

try {
    knowledge = fs.readFileSync("./knowledge/dnfc-library.txt", "utf8");
    console.log("DNFC knowledge loaded");
} catch (error) {
    console.log("Knowledge file not found");
}


// Test route
app.get("/", (req, res) => {
    res.send("DNFC Kingdom AI Backend is running");
});


// AI Question Route
app.post("/ask", async (req, res) => {

    const question = req.body.question || "";

    if (!question) {
        return res.json({
            answer: "Please enter a question."
        });
    }

    try {

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });


        const prompt = `
You are DNFC Kingdom AI.

You answer questions about Jesus Christ, the Bible, Christian teachings, and spiritual matters.

Your foundation is the DNFC Kingdom AI knowledge library below:

--------------------
${knowledge}
--------------------

Question:
${question}

Give a clear, biblical, spiritually insightful answer.
Stay faithful to the provided knowledge library.
`;


        const result = await model.generateContent(prompt);

        const response = result.response.text();


        res.json({
            answer: response
        });


    } catch (error) {

        console.log("GEMINI ERROR:", error.message);

        res.status(500).json({
            answer: "I am unable to answer right now.",
            error: error.message
        });

    }

});


// Render Port
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
    console.log("DNFC Kingdom AI server running on port " + PORT);
});
