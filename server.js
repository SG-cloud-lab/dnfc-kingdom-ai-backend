const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Safety check for API Key
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined in environment variables.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const app = express();

app.use(express.json());

// 2. Safely load knowledge file
let knowledge = "";
try {
    const filePath = path.join(__dirname, "knowledge", "dnfc-library.txt");
    knowledge = fs.readFileSync(filePath, "utf8");
    console.log("DNFC knowledge loaded successfully.");
} catch (error) {
    console.error("CRITICAL: Failed to load knowledge file:", error.message);
    // Continue even if empty, or process.exit(1) if mandatory
}

// Home route for status check
app.get("/", (req, res) => {
    res.status(200).send("DNFC Kingdom AI Backend is Live.");
});

// AI route
app.post("/ask", async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: "Question is required." });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are DNFC Kingdom AI. Answer based on this library: ${knowledge}\n\nQuestion: ${question}`;

        const result = await model.generateContent(prompt);
        const response = await result.response.text();

        res.json({ answer: response });
    } catch (error) {
        console.error("AI Service Error:", error);
        res.status(500).json({ error: "AI Service failed", details: error.message });
    }
});

// 3. Proper Production Port Handling
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`DNFC Kingdom AI Server is running on port ${PORT}`);
});
