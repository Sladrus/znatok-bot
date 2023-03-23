import PayModel from '../models/pay-model.js';

class PayService {
  async create(body) {
    try {
      const sub = await PayModel.create(body);
      return sub;
    } catch (e) {
      console.log(e);
    }
  }

  async findCount(filter) {
    try {
      const pays = await PayModel.find(filter);
      return pays.length;
    } catch (e) {
      console.log(e);
    }
  }

  async clearRef(filter) {
    try {
      const pays = await PayModel.updateMany(filter, {
        $set: { refClear: true },
      });
      return pays;
    } catch (e) {
      console.log(e);
    }
  }
}

export default new PayService();
