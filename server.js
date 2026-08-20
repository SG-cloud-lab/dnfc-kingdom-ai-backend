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
    console.error("FATAL ERROR: GEMINI_API_KEY is missing");
}


const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || ""
);


const app = express();

app.use(express.json());



// =================================
// LOAD ALL DNFC KNOWLEDGE FILES
// =================================

let knowledge = "";


try {

    const knowledgeFolder = path.join(
        __dirname,
        "knowledge"
    );


    const files = fs.readdirSync(
        knowledgeFolder
    );


    files.forEach((file)=>{


        if(file.endsWith(".txt")){


            const fileContent = fs.readFileSync(
                path.join(
                    knowledgeFolder,
                    file
                ),
                "utf8"
            );


            knowledge += `

===========================
SOURCE: ${file}
===========================

${fileContent}

`;

        }


    });


    console.log(
        "All DNFC knowledge files loaded successfully."
    );


} catch(error){


    console.error(
        "Knowledge loading error:",
        error.message
    );


}



// =================================
// LOAD AI INSTRUCTIONS
// =================================


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




// =================================
// HOME ROUTE
// =================================


app.get("/",(req,res)=>{


    res.send(
        "DNFC Kingdom AI Backend is Live."
    );


});




// =================================
// AI QUESTION ROUTE
// =================================


app.post("/ask", async(req,res)=>{


    console.log(
        "ASK ROUTE REACHED"
    );


    const question = req.body.question;


    if(!question){


        return res.status(400).json({

            error:"Question is required"

        });


    }



    try{


        const model = genAI.getGenerativeModel({

            model:"gemini-3.6-flash"

        });



        const prompt = `


${instructions}



DNFC KNOWLEDGE LIBRARY:


${knowledge}



USER QUESTION:


${question}



Answer using DNFC teachings first.

If the answer exists in the DNFC library, prioritize that understanding.

Use Scripture and provide a clear Christ-centred explanation.



`;



        console.log(
            "Sending request to Gemini..."
        );



        const result = await model.generateContent(
            prompt
        );


        const answer = result.response.text();



        res.json({

            answer:answer

        });



    }catch(error){


        console.error(
            "GEMINI ERROR:",
            error
        );


        res.status(500).json({

            error:"AI Service failed",

            details:error.message

        });


    }


});




// =================================
// START SERVER
// =================================


const PORT = process.env.PORT || 10000;


app.listen(
    PORT,
    "0.0.0.0",
    ()=>{


        console.log(
            `DNFC Kingdom AI Server running on port ${PORT}`
        );


    }
);
