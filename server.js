require("dotenv").config();
const express = require("express");
const askAI = require("./ai");

const app = express();

app.use(express.json());

app.get("/", (req,res)=>{
  res.send("DNFC Kingdom AI Backend is running");
});

const PORT = 3000;

app.post("/ask", async (req,res)=>{

  const question = req.body.question;

  const answer = await askAI(question);

  res.json({
    answer: answer
  });

});

app.listen(PORT, ()=>{
  console.log(`DNFC Kingdom AI running on port ${PORT}`);
});
