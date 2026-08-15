const express = require("express");
const fs = require("fs");

const app = express();

app.use(express.json());
let knowledge = "";

try {
    knowledge = fs.readFileSync("./knowledge/dnfc-library.txt", "utf8");
    console.log("DNFC knowledge loaded");
} catch (error) {
    console.log("Knowledge file not found");
}


// Load DNFC knowledge
let knowledge = "";

try {
    knowledge = fs.readFileSync("../knowledge/dnfc-library.txt", "utf8");
    console.log("DNFC knowledge loaded");
} catch (error) {
    console.log("Knowledge file not found");
}


// AI question endpoint
app.post("/ask", (req, res) => {

    const question = req.body.question.toLowerCase();

    let answer = "I am searching the DNFC Kingdom AI knowledge library.";


    if(question.includes("christ")) {

        answer = "According to DNFC Kingdom AI teachings, Christ is the centre of God's revelation and the expression of God's eternal purpose.";

    }


    else if(question.includes("eternal")) {

        answer = "Eternal life is the very life of God revealed through Jesus Christ.";

    }


    else {

        // Search the knowledge file
        const words = question.split(" ");

        let found = knowledge
        .split("\n")
        .filter(line =>
            words.some(word => 
                line.toLowerCase().includes(word)
            )
        )
        .slice(0,5);


        if(found.length > 0){
            answer = found.join(" ");
        }
    }


    res.json({
        answer: answer
    });

});


// Render uses PORT environment variable
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("DNFC Kingdom AI server running on port " + PORT);
});
