import UserModel from '../models/user-model.js';

class UserService {
  async create(body) {
    try {
      //   await UserModel.deleteOne({ userId: body.userId });
      const user = await UserModel.findOne({ userId: body.userId });
      if (user) return user;
      const newUser = await UserModel.create(body);
      return newUser;
    } catch (e) {
      console.log(e);
    }
  }

  async update(filter, body) {
    try {
      const newUser = await UserModel.updateOne(filter, body);
      const user = await UserModel.findOne(filter);

      return user;
    } catch (e) {
      console.log(e);
    }
  }

  async findCount(filter) {
    try {
      const users = await UserModel.find(filter);
      return users.length;
    } catch (e) {
      console.log(e);
    }
  }
}

export default new UserService();
