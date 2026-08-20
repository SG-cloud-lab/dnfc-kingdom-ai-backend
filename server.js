const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});


const { GoogleGenerativeAI } = require("@google/generative-ai");


if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined.");
}


const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || ""
);


const app = express();

app.use(express.json());


// ================================
// LOAD DNFC KNOWLEDGE LIBRARY
// ================================

let knowledge = "";

try {

    const knowledgePath = path.join(
        __dirname,
        "knowledge",
        "dnfc-library.txt"
    );

    knowledge = fs.readFileSync(
        knowledgePath,
        "utf8"
    );

    console.log(
        "DNFC knowledge loaded successfully."
    );

} catch(error) {

    console.error(
        "Knowledge file error:",
        error.message
    );

}



// ================================
// LOAD DNFC AI INSTRUCTIONS
// ================================

let instructions = "";

try {

    const instructionPath = path.join(
        __dirname,
        "dnfc-ai-instructions.txt"
    );


    instructions = fs.readFileSync(
        instructionPath,
        "utf8"
    );


    console.log(
        "DNFC AI instructions loaded successfully."
    );


} catch(error) {

    console.error(
        "Instructions file error:",
        error.message
    );

}



// ================================
// HOME TEST ROUTE
// ================================

app.get("/", (req,res)=>{

    res.status(200).send(
        "DNFC Kingdom AI Backend is Live."
    );

});




// ================================
// AI QUESTION ROUTE
// ================================

app.post("/ask", async(req,res)=>{


    console.log(
        "ASK ROUTE REACHED"
    );


    if(!req.body || !req.body.question){

        return res.status(400).json({

            error:"Question is required."

        });

    }


    const question = req.body.question;



    try {


        const model = genAI.getGenerativeModel({

            model:"gemini-3.6-flash"

        });



        const prompt = `


${instructions}


========================
DNFC KNOWLEDGE LIBRARY
========================

${knowledge}



========================
USER QUESTION
========================

${question}



Answer according to the DNFC Kingdom AI instructions.

Give a biblical, Christ-centred and spiritually insightful response.

`;



        console.log(
            "Sending request to Gemini..."
        );



        const result = await model.generateContent(
            prompt
        );


        const answer = result.response.text();



        res.json({

            answer: answer

        });



    } catch(error){


        console.error(
            "DETAILED AI ERROR:",
            error
        );


        res.status(500).json({

            error:"AI Service failed",

            details:error.message

        });


    }


});




// ================================
// START SERVER
// ================================

const PORT = process.env.PORT || 10000;


app.listen(
    PORT,
    "0.0.0.0",
    ()=>{

        console.log(
            `DNFC Kingdom AI Server is running on port ${PORT}`
        );

    }
);
