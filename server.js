const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const admin = require("firebase-admin");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// ===============================
// MIDDLEWARE (CRITICAL FOR CORS)
// ===============================
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Handle preflight OPTIONS requests
app.options("*", cors());


// ===============================
// GEMINI CONNECTION
// ===============================

if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL: GEMINI_API_KEY missing");
}

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);
// ==============================
// FIREBASE CONNECTION
// ==============================

const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log("Firebase connected successfully.");

// ===============================
// LOAD DNFC KNOWLEDGE LIBRARY
// ===============================

let knowledge = "";

try {

    const libraryPath = path.join(
        __dirname,
        "knowledge",
        "dnfc-library.txt"
    );

    const library = fs.readFileSync(
        libraryPath,
        "utf8"
    );


    const revelationsFolder = path.join(
        __dirname,
        "knowledge",
        "revelations"
    );


    let revelations = "";


    const revelationFiles = fs.readdirSync(
        revelationsFolder
    );


    for (const file of revelationFiles) {

        if (file.endsWith(".txt")) {

            const filePath = path.join(
                revelationsFolder,
                file
            );


            const content = fs.readFileSync(
                filePath,
                "utf8"
            );


            revelations +=
            "\n\n===== " +
            file.toUpperCase() +
            " =====\n\n" +
            content;

        }

    }


    knowledge =
    "===== DNFC LIBRARY =====\n\n" +
    library +
    "\n\n===== DNFC REVELATIONS =====\n\n" +
    revelations;


    console.log(
        "DNFC knowledge loaded successfully."
    );


}
catch(error){

    console.error(
        "Knowledge loading error:",
        error.message
    );

}

// ===============================
// LOAD DNFC REVELATIONS
// ===============================

let revelations = "";

try {
    revelations = fs.readFileSync(
        path.join(
            __dirname,
            "knowledge",
            "dnfc-revelations.txt"
        ),
        "utf8"
    );

    console.log(
        "DNFC revelations loaded successfully."
    );

} catch(error){

    console.error(
        "Revelations loading error:",
        error.message
    );

}

// ==============================
// LOAD KINGDOM INSIGHTS
// ==============================

let kingdomInsights = "";

try {
    kingdomInsights = fs.readFileSync(
        path.join(
            __dirname,
            "knowledge",
            "kingdom-insights",
            "kingdom-insights.txt"
        ),
        "utf8"
    );

    console.log(
        "Kingdom insights loaded successfully."
    );

} catch(error){

    console.error(
        "Kingdom insights loading error:",
        error.message
    );

}

// ===============================
// LOAD AI INSTRUCTIONS
// ===============================

let instructions = "";

try {
    instructions = fs.readFileSync(
        path.join(
            __dirname,
            "dnfc-ai-instructions.txt"
        ),
        "utf8"
    );

    console.log(
        "DNFC AI instructions loaded successfully."
    );

} catch(error){
    console.error(
        "Instructions loading error:",
        error.message
    );
}


// ===============================
// TEST ROUTE
// ===============================

app.get("/", (req, res) => {
    res.send("DNFC Kingdom AI Backend is Live.");
});


// ===============================
// AI QUESTION ROUTE
// ===============================

app.post("/ask", async (req, res) => {
    console.log("ASK ROUTE REACHED");

    const question = req.body.question;

    if (!question) {
        return res.status(400).json({
            error: "Please provide a question"
        });
    }

    try {
        // Updated to a valid model identifier
        const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash"
});

        const prompt = `
You are DNFC Kingdom AI.

You are not a general chatbot.

Your primary purpose is to teach according to the DNFC Kingdom AI knowledge library and instructions.

IMPORTANT RULES:

1. Always check and follow the DNFC instructions first.

2. Always use the DNFC knowledge library as your first source of truth.

3. Do not contradict DNFC teachings.

4. If the answer exists in the DNFC library, answer from the library.

5. Only use general Gemini knowledge when the DNFC library does not contain enough information.

6. Keep answers biblical, spiritual, clear and mature.

7. When explaining Scripture, focus on Christ, the finished work of Christ, the Holy Spirit, identity in Christ, and God's eternal purpose.

========================

DNFC AI INSTRUCTIONS:

${instructions}


========================

DNFC KNOWLEDGE SOURCES:

${knowledge}


========================
DNFC REVELATIONS:

${revelations}

========================

DNFC KINGDOM INSIGHTS:

${kingdomInsights}


========================


USER QUESTION:

${question}


Give a detailed but understandable answer.
`;

        console.log("Sending request to Gemini...");

        const result = await model.generateContent(prompt);
        const answer = result.response.text();
// ==============================
// SAVE CHAT TO FIREBASE
// ==============================

try {

    await db.collection("conversations").add({
        question: question,
        answer: answer,
        createdAt: new Date()
    });

    console.log("Conversation saved to Firebase successfully.");

} catch (firebaseError) {

    console.error(
        "Firebase save error:",
        firebaseError.message
    );

}
        res.json({
            answer: answer
        });

    } catch (error) {
        console.error("GEMINI ERROR:", error);
        res.status(500).json({
            error: "AI Service failed",
            details: error.message
        });
    }
});


// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 10000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            "DNFC Kingdom AI Server running on port " + PORT
        );
    }
);
