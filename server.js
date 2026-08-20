const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! Shutting down...', err);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...', err);
});

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Verify API Key
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const app = express();

app.use(express.json());

// Load knowledge
let knowledge = "";
try {
    const filePath = path.join(__dirname, "knowledge", "dnfc-library.txt");
    knowledge = fs.readFileSync(filePath, "utf8");
    console.log("DNFC knowledge loaded successfully.");
} catch (error) {
    console.error("Knowledge file error:", error.message);
}

// Routes
app.get("/", (req, res) => {
    res.status(200).send("DNFC Kingdom AI Backend is Live.");
});

app.post("/ask", async (req, res) => {
    console.log("ASK ROUTE REACHED");

    if (!req.body || !req.body.question) {
        console.error("BAD REQUEST: Missing question");
        return res.status(400).json({ error: "Question is required." });
    }

    const { question } = req.body;

    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("API Key missing on server");
        }

        // Using the standard 'gemini-1.5-flash' identifier
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `You are DNFC Kingdom AI. You answer questions about Jesus Christ, the Bible, Christian teachings, and spiritual truth. Use this knowledge library: ${knowledge}\n\nQuestion: ${question}\n\nGive a clear, biblical, spiritually insightful answer.`;

        console.log("Sending request to Gemini...");
        const result = await model.generateContent(prompt);
        const response = await result.response.text();

        res.json({ answer: response });
    } catch (error) {
        console.error("DETAILED AI ERROR:", error);
        res.status(500).json({ 
            error: "AI Service failed", 
            details: error.message 
        });
    }
});

// Server listener
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`DNFC Kingdom AI Server is running on port ${PORT}`);
});
