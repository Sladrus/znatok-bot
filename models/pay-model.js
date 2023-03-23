import { Schema, model } from 'mongoose';

const paySchema = new Schema({
  userId: { type: Number, required: true },
  username: { type: String, required: true },
  currency: { type: String, required: true },
  total_amount: { type: Number, required: true },
  provider_payment_charge_id: { type: String, required: true },
  refName: { type: String },
  refClear: { type: Boolean, default: false },
  date: { type: Number, required: true },
});

const PayModel = model('Pay', paySchema);

export default PayModel;
