import ChatModel from '../models/chat-model.js';
import payService from './pay-service.js';

class ChatService {
  async create(body) {
    try {
      const chat = await ChatModel.create(body);
      return chat;
    } catch (e) {
      console.log(e);
    }
  }

  async findOne(filter) {
    try {
      const chat = await ChatModel.findOne(filter);
      return chat;
    } catch (e) {
      console.log(e);
    }
  }

  async findRefs(filter) {
    try {
      const refs = [];
      const chats = await ChatModel.find(filter);
      for (var i = 0; i < chats.length; i++) {
        const count = await payService.findCount({
          refName: chats[i].ref,
          refClear: false,
        });
        refs.push({
          refName: chats[i].ref,
          count,
        });
      }
      return refs;
    } catch (e) {
      console.log(e);
    }
  }
}

export default new ChatService();
