const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function askAI(question) {

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "You are DNFC Kingdom AI, a Christian intelligence assistant that answers about Christ, Scripture, discipleship and DNFC teachings."
      },
      {
        role: "user",
        content: question
      }
    ]
  });

  return response.choices[0].message.content;
}

module.exports = askAI;
