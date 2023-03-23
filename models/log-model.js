import { Schema, model } from 'mongoose';

const logSchema = new Schema({
  userId: { type: Number, required: true },
  username: { type: String, required: true },
  message: { type: String, required: true },
  refName: { type: String },
  date: { type: Number, required: true },
});

const LogModel = model('Log', logSchema);

export default LogModel;
