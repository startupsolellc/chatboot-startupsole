// netlify/functions/openaiProxy.js

const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Netlify Environment Variables üzerinden API anahtarını alıyoruz
});

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);
    const userMessage = body.message || '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Kullanıcı API anahtarının desteklediği model
      messages: [{ role: 'user', content: userMessage }],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: response.choices[0].message.content }),
    };
  } catch (error) {
    console.error('OpenAI API Hatası:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Sunucu hatası, lütfen daha sonra tekrar deneyin.' }),
    };
  }
};
