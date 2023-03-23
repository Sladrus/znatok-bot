import LogModel from '../models/log-model.js';

class LogService {
  async create(body) {
    try {
      const newLog = await LogModel.create(body);
      return newLog;
    } catch (e) {
      console.log(e);
    }
  }
}

export default new LogService();
