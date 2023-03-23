import { ChatGPTAPI } from 'chatgpt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import TelegramBot from 'node-telegram-bot-api';
import initBot from './bot.js';
dotenv.config();

const start = async () => {
  try {
    const api = new ChatGPTAPI({
      apiKey: process.env.CHATGPT_TOKEN,
      temperature: 1,
    });
    const bot = new TelegramBot(
      process.env.BOT_TOKEN,
      {
        polling: true,
      }
    );
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Server started');
    await initBot(bot, api);
  } catch (e) {
    console.log(e);
  }
};

start();
