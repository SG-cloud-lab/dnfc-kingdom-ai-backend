const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const admin = require("firebase-admin");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.options("*", cors());


// ===============================
// GEMINI CONNECTION
// ===============================

if (!process.env.GEMINI_API_KEY) {

    console.error(
        "FATAL: GEMINI_API_KEY missing"
    );

}


const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);


// ===============================
// FIREBASE CONNECTION
// ===============================


const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
);


admin.initializeApp({

    credential:
    admin.credential.cert(serviceAccount)

});


const db = admin.firestore();


console.log(
    "Firebase connected successfully."
);


// ===============================
// GEMINI FALLBACK SYSTEM
// ===============================

async function generateWithFallback(prompt){


    const models = [

        "gemini-3.6-flash",

        "gemini-2.5-flash"

    ];


    let lastError;



    for(const modelName of models){


        try{


            console.log(
                "Trying model:",
                modelName
            );


            const model =
            genAI.getGenerativeModel({

                model:modelName

            });



            const result =
            await model.generateContent(prompt);



            return result.response.text();



        }catch(error){


            console.log(

                modelName + " failed:",

                error.message

            );


            lastError = error;


        }


    }


    throw lastError;


}


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


    const library =
    fs.readFileSync(

        libraryPath,

        "utf8"

    );



    const revelationsFolder =
    path.join(

        __dirname,

        "knowledge",

        "revelations"

    );



    let revelationContent = "";



    const revelationFiles =
    fs.readdirSync(

        revelationsFolder

    );



    for(const file of revelationFiles){


        if(file.endsWith(".txt")){


            const filePath =
            path.join(

                revelationsFolder,

                file

            );



            const content =
            fs.readFileSync(

                filePath,

                "utf8"

            );



            revelationContent +=

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

    revelationContent;



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


try{


    revelations =
    fs.readFileSync(

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


}
catch(error){


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


    kingdomInsights =
    fs.readFileSync(

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


}
catch(error){


    console.error(

        "Kingdom insights loading error:",

        error.message

    );


}


// ===============================
// LOAD AI INSTRUCTIONS
// ===============================


let instructions = "";


try{


    instructions =
    fs.readFileSync(

        path.join(

            __dirname,

            "dnfc-ai-instructions.txt"

        ),

        "utf8"

    );


    console.log(

        "DNFC AI instructions loaded successfully."

    );


}
catch(error){


    console.error(

        "Instructions loading error:",

        error.message

    );


}



// ===============================
// TEST ROUTE
// ===============================


app.get("/", (req,res)=>{


    res.send(
        "DNFC Kingdom AI Backend is Live."
    );


});



// ===============================
// AI QUESTION ROUTE
// ===============================


app.post("/ask", async (req,res)=>{


    console.log(
        "ASK ROUTE REACHED"
    );


    const question =
    req.body.question;



    if(!question){


        return res.status(400).json({

            error:
            "Please provide a question"

        });


    }



    try{


        const prompt = `

You are DNFC Kingdom AI.

You are not a general chatbot.

Your purpose is to teach according to the DNFC Kingdom AI knowledge library and instructions.

Always follow DNFC instructions first.

Use DNFC knowledge sources as the first source of truth.

Keep answers biblical, spiritual, clear and mature.

Focus on Christ, the finished work of Christ, the Holy Spirit, identity in Christ, and God's eternal purpose.


========================

DNFC AI INSTRUCTIONS:

${instructions}


========================

DNFC KNOWLEDGE:

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



        console.log(
            "Sending request to Gemini..."
        );



        const answer =
        await generateWithFallback(prompt);



        await db
        .collection("conversations")
        .add({

            question:question,

            answer:answer,

            createdAt:new Date()

        });



        res.json({

            answer:answer

        });



    }
    catch(error){


        console.error(

            "GEMINI ERROR:",

            error

        );


        res.status(500).json({

            error:
            "AI Service failed",

            details:
            error.message

        });


    }


});




// ==============================
// LOAD CONVERSATIONS
// ==============================


app.get("/conversations", async(req,res)=>{


    try{


        const snapshot =
        await db

        .collection("conversations")

        .orderBy(
            "createdAt",
            "desc"
        )

        .get();



        let conversations = [];



        snapshot.forEach(doc=>{


            conversations.push({

                id:doc.id,

                ...doc.data()

            });


        });



        res.json(conversations);



    }
    catch(error){


        res.status(500).json({

            error:error.message

        });


    }


});



// ==============================
// AI DAILY DEVOTION GENERATOR
// ==============================


app.post("/generate-devotions", async(req,res)=>{


    const theme =
    req.body.theme;


    const days =
    req.body.days || 7;



    if(!theme){


        return res.status(400).json({

            error:
            "Please provide a devotion theme"

        });


    }



    try{


        const prompt = `

You are DNFC Kingdom AI Daily Devotion Generator.

Create ${days} daily devotions based on this theme:

${theme}


Use DNFC knowledge, revelations, kingdom insights and instructions.

Each devotion must contain:

title
scripture
verseText
teaching (3-5 paragraphs)
goldenNugget
prayer
furtherStudy
theme
day


Return ONLY valid JSON.

Format:

[
{
"title":"",
"scripture":"",
"verseText":"",
"teaching":[
"Paragraph 1",
"Paragraph 2",
"Paragraph 3"
],
"goldenNugget":"",
"prayer":"",
"furtherStudy":[
"Romans 5:17"
],
"theme":"${theme}",
"day":1
}
]


DNFC AI INSTRUCTIONS:

${instructions}


DNFC KNOWLEDGE:

${knowledge}


DNFC REVELATIONS:

${revelations}


KINGDOM INSIGHTS:

${kingdomInsights}

`;



        const text =
        await generateWithFallback(prompt);



        const cleanJSON =
        text
        .replace(/```json/g,"")
        .replace(/```/g,"")
        .trim();



        const devotions =
        JSON.parse(cleanJSON);



        for(const devotion of devotions){


            await db

            .collection(
                "daily-devotions-drafts"
            )

            .add({

                ...devotion,

                status:"draft",

                createdAt:new Date()

            });


        }



        res.json({

            message:
            "Devotions generated successfully",

            count:
            devotions.length

        });



    }
    catch(error){


        console.error(

            "Devotion generator error:",

            error.message

        );



        res.status(500).json({

            error:error.message

        });


    }


});

// ==============================
// GET DAILY DEVOTION DRAFTS
// ==============================

app.get("/daily-devotions-drafts", async(req,res)=>{

    try{

        const snapshot =
        await db
        .collection("daily-devotions-drafts")
        .orderBy("createdAt","desc")
        .get();


        let drafts = [];


        snapshot.forEach(doc=>{

            drafts.push({

                id:doc.id,

                ...doc.data()

            });

        });


        res.json(drafts);


    }
    catch(error){

        console.error(
            "Draft loading error:",
            error.message
        );


        res.status(500).json({

            error:error.message

        });

    }

});
// ==============================
// GET SINGLE DEVOTION DRAFT
// ==============================

app.get("/daily-devotions-drafts/:id", async(req,res)=>{

    try{

        const id = req.params.id;


        const doc =
        await db
        .collection("daily-devotions-drafts")
        .doc(id)
        .get();



        if(!doc.exists){

            return res.status(404).json({
                error:"Draft not found"
            });

        }



        res.json({

            id:doc.id,
            ...doc.data()

        });


    }
    catch(error){

        console.error(
            "Single draft loading error:",
            error.message
        );


        res.status(500).json({
            error:error.message
        });

    }

});


// ==============================
// APPROVE DAILY DEVOTION DRAFT
// ==============================

app.patch("/daily-devotions-drafts/:id/approve", async(req,res)=>{

    try{


        const draftId = req.params.id;


        // Get draft

        const draftDoc =
        await db
        .collection("daily-devotions-drafts")
        .doc(draftId)
        .get();



        if(!draftDoc.exists){

            return res.status(404).json({

                error:"Draft not found"

            });

        }



        const devotion =
        draftDoc.data();



        // Save as published devotion

        await db
        .collection("daily-devotions")
        .add({

            ...devotion,

            status:"published",

            approvedAt:new Date()

        });



        // Remove from drafts

        await db
        .collection("daily-devotions-drafts")
        .doc(draftId)
        .delete();



        res.json({

            message:
            "Devotion approved and published successfully."

        });



    }
    catch(error){


        console.error(

            "Approval error:",

            error.message

        );


        res.status(500).json({

            error:error.message

        });


    }


});

// ==============================
// DAILY DEVOTIONS SYSTEM
// ==============================


// Save Daily Devotion

app.post("/daily-devotions", async(req,res)=>{


    try{


        const devotion =
        req.body;



        await db

        .collection("daily-devotions")

        .add(devotion);



        res.json({

            message:
            "Daily devotion saved successfully."

        });



    }
    catch(error){


        console.error(

            "Daily devotion save error:",

            error.message

        );


        res.status(500).json({

            error:error.message

        });


    }


});


// ==============================
// GET ALL PUBLISHED DEVOTIONS FOR ADMIN
// ==============================

app.get("/admin/published-devotions", async(req,res)=>{

    try{

        const snapshot =
        await db
        .collection("daily-devotions")
        .orderBy("publishedAt","desc")
        .get();


        let devotions = [];


        snapshot.forEach(doc=>{

            devotions.push({

                id:doc.id,

                ...doc.data()

            });

        });


        res.json(devotions);


    }
    catch(error){

        console.error(
            "Published devotion loading error:",
            error.message
        );


        res.status(500).json({

            error:error.message

        });

    }

});


// ==============================
// DELETE PUBLISHED DEVOTION
// ==============================

app.delete("/daily-devotions/:id", async(req,res)=>{

    try{

        const id = req.params.id;


        await db
        .collection("daily-devotions")
        .doc(id)
        .delete();


        res.json({

            message:"Devotion deleted successfully"

        });


    }
    catch(error){

        res.status(500).json({

            error:error.message

        });

    }

});

// ==============================
// GET PUBLISHED DAILY DEVOTIONS
// ==============================


app.get("/daily-devotions", async(req,res)=>{


    try{


        const snapshot =
        await db

        .collection("daily-devotions")

        .where(
            "status",
            "==",
            "published"
        )

        .get();



        let devotions = [];



        snapshot.forEach(doc=>{


            devotions.push({

                id:doc.id,

                ...doc.data()

            });


        });



        res.json(devotions);



    }
    catch(error){


        console.error(

            "Daily devotion loading error:",

            error.message

        );



        res.status(500).json({

            error:error.message

        });


    }


});



// ==============================
// APPROVE DEVOTION DRAFT
// ==============================

app.patch("/daily-devotions-drafts/:id/approve", async(req,res)=>{

    try{

        const id = req.params.id;


        const draftDoc =
        await db
        .collection("daily-devotions-drafts")
        .doc(id)
        .get();



        if(!draftDoc.exists){

            return res.status(404).json({
                error:"Draft not found"
            });

        }



        const devotion =
        draftDoc.data();



        await db
        .collection("daily-devotions")
        .add({

            ...devotion,

            status:"published",

            publishedAt:new Date()

        });



        await db
        .collection("daily-devotions-drafts")
        .doc(id)
        .delete();



        res.json({

            message:"Devotion approved successfully"

        });


    }
    catch(error){

        console.error(
            "Approval error:",
            error.message
        );


        res.status(500).json({

            error:error.message

        });

    }

});

// ==============================
// PUBLISH DAILY DEVOTION
// ==============================


app.patch(
"/daily-devotions/:id/publish",
async(req,res)=>{


    try{


        const devotionId =
        req.params.id;



        await db

        .collection("daily-devotions")

        .doc(devotionId)

        .update({

            status:"published",

            publishedAt:new Date()

        });



        res.json({

            message:
            "Daily devotion published successfully."

        });



    }
    catch(error){


        console.error(

            "Publishing error:",

            error.message

        );



        res.status(500).json({

            error:error.message

        });


    }


});





// ===============================
// START SERVER
// ===============================


const PORT =
process.env.PORT || 10000;



app.listen(

    PORT,

    "0.0.0.0",

    ()=>{


        console.log(

            "DNFC Kingdom AI Server running on port "
            + PORT

        );


    }

);
