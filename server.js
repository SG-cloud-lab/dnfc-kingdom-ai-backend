const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("DNFC Kingdom AI Backend is running");
});

app.post("/ask", (req, res) => {
  const question = req.body.question;

  res.json({
    answer: "Your question was received: " + question
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`DNFC Kingdom AI running on port ${PORT}`);
});
