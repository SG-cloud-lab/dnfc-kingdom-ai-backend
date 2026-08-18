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

// AI question endpoint
app.get("/", (req, res) => {
    res.send("DNFC Kingdom AI Backend is running");
});
app.post("/ask", async (req, res) => {

    const question = req.body.question || "";

    try {

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const prompt = `
You are DNFC Kingdom AI.

Answer questions about Jesus Christ, the Bible, and Christian teachings.

Use this DNFC knowledge library:

${knowledge}

Question:
${question}

Give a clear, biblical and spiritually insightful answer.
`;

        const result = await model.generateContent(prompt);

        const response = result.response.text();

        res.json({
            answer: response
        });

    } catch(error) {

        console.log(error);

        res.json({
            answer: "I am unable to answer right now."
        });

    }

});

// Render uses PORT environment variable
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("DNFC Kingdom AI server running on port " + PORT);
});
