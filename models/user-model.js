import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  userId: { type: Number, unique: true, required: true },
  username: { type: String, required: true },
  phone: { type: String },
  freeTry: { type: Number, required: true, default: 10 },
  isActivated: { type: Boolean, default: false },
  activationDate: { type: Number },
  paymentId: { type: String },
  refName: { type: String },
});

const UserModel = model('User', userSchema);

export default UserModel;
