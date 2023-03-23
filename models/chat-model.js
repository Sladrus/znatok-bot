import { Schema, model } from 'mongoose';

const chatSchema = new Schema({
  chatId: { type: Number, required: true },
  title: { type: String, required: true },
  ref: { type: String, required: true, unique: true },
});

const ChatModel = model('Chat', chatSchema);

export default ChatModel;
