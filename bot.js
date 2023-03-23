import dotenv from 'dotenv';
import logService from './services/log-service.js';
import userService from './services/user-service.js';
import utils from './utils.js';
import Command from 'telegram-command-handler';
import chatService from './services/chat-service.js';
import payService from './services/pay-service.js';
import { YooCheckout } from '@a2seven/yoo-checkout';
dotenv.config();

const MONTH = 2629743;

const checkout = new YooCheckout({
  shopId: process.env.YOO_SHOP_ID,
  secretKey: process.env.YOO_SECRET_KEY,
});

async function findOrCreateUser(msg) {
  const username = msg.chat.username || msg.chat.first_name;
  const refName = msg.text?.includes(' ') ? msg.text.split(' ')[1] : undefined;
  const userId = msg.chat.id;

  const user = await userService.create({
    userId,
    username,
    refName,
  });
  return user;
}

async function createLog(msg) {
  const user = await findOrCreateUser(msg);
  const log = await logService.create({
    userId: user.userId,
    username: user.username,
    message: msg.text,
    refName: user.refName,
    date: Date.now() / 1000,
  });

  return log;
}

async function createPay(message, paymentInfo, refName) {
  const pay = await payService.create({
    userId: message.chat.id,
    username: message.chat.username || message.chat.first_name,
    currency: paymentInfo.amount.currency,
    total_amount: paymentInfo.amount.value,
    provider_payment_charge_id: paymentInfo.id,
    refName: refName,
    date: Date.now() / 1000,
  });
  return pay;
}

async function isValidDate(user) {
  if (user.isActivated) {
    const activationDate = user.activationDate;
    const nowDate = Date.now() / 1000;
    if (nowDate > activationDate + MONTH) {
      const newUser = await userService.update(
        {
          _id: user._id,
        },
        { isActivated: false }
      );
      return false;
    } else {
      return true;
    }
  }
  return true;
}

// создаем экземпляр бота
async function initBot(bot, api) {
  //Записываем лог
  bot.on('message', async function (message) {
    if (
      message.text?.includes('/start') ||
      message.text?.includes('/chat') ||
      message.text?.includes('/ref') ||
      message.text?.includes('/pay') ||
      !message.text ||
      message.chat.type == 'supergroup'
    )
      return;
    const log = await createLog(message);
    console.log(log);
    var user = await findOrCreateUser(message);

    if (!isValidDate(user)) {
      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔒 Оформить подписку', callback_data: 'subscribe' }],
          ],
        },
        parse_mode: 'HTML',
      };
      await bot.sendMessage(
        message.chat.id,
        `<b>Ваша подписка закончилась!</b>\n\n Оформите ее снова, чтобы продолжить пользоваться ботом!`,
        opts
      );
      return;
    }
    try {
      if (!user.isActivated) {
        if (user.freeTry > 0) {
          user = await userService.update(
            {
              _id: user._id,
            },
            { freeTry: user.freeTry - 1 }
          );
          await bot.sendMessage(
            message.chat.id,
            `Осталось пробных вопросов: ${user.freeTry}`
          );
        } else {
          const opts = {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔒 Оформить подписку', callback_data: 'subscribe' }],
              ],
            },
            parse_mode: 'HTML',
          };
          await bot.sendMessage(
            message.chat.id,
            `<b>${
              !user.activationDate
                ? 'Пробные вопросы закончились!'
                : 'Подписка закончилась!'
            }</b>\n\nЧтобы <b>продолжить</b> пользоватсья нашим ботом <b>неограниченное</b> количество раз, купите подписку всего за <b>200 рублей</b>!`,
            opts
          );
          return;
        }
      }

      await bot.sendMessage(message.chat.id, 'Дай мне минутку подумать!');
      let res = await api.sendMessage(
        message.text +
          '\nОтвечай только на русском и не упоминай, что ты это chatGPT'
      );
      await bot.sendMessage(message.chat.id, res.text);
    } catch (e) {
      console.log(e);
    }
  });

  const chat = new Command(bot, 'chat');
  chat.on('receive', async function (msg, args) {
    if (args['=ERRORS'].length) return;
    const admins = await bot.getChatAdministrators(msg.chat.id);
    const admin = admins.find(
      (o) => o.user.id === 1274681231 || o.user.id === 985502161
    );
    if (!admin) {
      await bot.sendMessage(msg.chat.id, `Валидные админы отсутствуют`);
      return;
    }
    const refs = await chatService.findRefs({ chatId: msg.chat.id });
    for (var i = 0; i < refs.length; i++) {
      await bot.sendMessage(
        msg.chat.id,
        `Реферальный код: ${refs[i].refName}, Количество подписок: ${refs[i].count}`
      );
    }
  });

  const pay = new Command(bot, 'pay');

  pay.on('receive', async function (msg, args) {
    if (args['=ERRORS'].length || !args.length) return;
    const admins = await bot.getChatAdministrators(msg.chat.id);
    const admin = admins.find(
      (o) => o.user.id === 1274681231 || o.user.id === 985502161
    );

    if (!admin) {
      await bot.sendMessage(msg.chat.id, `Валидные админы отсутствуют`);
      return;
    }

    if (msg.from.id == 1274681231 || msg.from.id == 985502161) {
      const res = await payService.clearRef({ refName: args[0] });
      await bot.sendMessage(
        msg.chat.id,
        `Все прошедшие подписки по реферальному коду ${args[0]} оплачены!`
      );
    }
  });

  const ref = new Command(bot, 'ref');

  ref.on('receive', async function (msg, args) {
    if (args['=ERRORS'].length || !args.length) return;
    const admins = await bot.getChatAdministrators(msg.chat.id);
    const admin = admins.find(
      (o) => o.user.id === 1274681231 || o.user.id === 985502161
    );
    if (!admin) {
      await bot.sendMessage(msg.chat.id, `Валидные админы отсутствуют`);
      return;
    }
    if (msg.from.id == 1274681231 || msg.from.id == 985502161) {
      const refLink = `https://t.me/easy_answer_bot?start=${args[0]}`;
      try {
        const chat = await chatService.create({
          chatId: msg.chat.id,
          title: msg.chat.title,
          ref: args[0],
        });
        if (!chat)
          throw Error(
            'Произошал ошибка! Вероятно такой реферальный код уже существует.'
          );
        await bot.sendMessage(
          msg.chat.id,
          `Реферальная ссылка создана: ${refLink}.\nИ закреплена за этим чатом ID: ${msg.chat.id}`
        );
      } catch (e) {
        console.log(e);
        await bot.sendMessage(msg.chat.id, e.message);
      }
    }
  });
  // обработчик команды /start
  bot.onText(/\/start/, async (msg) => {
    if (msg.chat.type != 'private') return;
    const user = await findOrCreateUser(msg);
    const chatId = msg.chat.id;
    // создаем кнопку "Подписаться"

    const subButton = user.phone
      ? [
          {
            text: '🔒 Оформить подписку',
            callback_data: 'subscribe',
          },
        ]
      : [
          {
            text: '🔒 Оформить подписку',
            callback_data: 'request_contact',
            request_contact: true,
          },
        ];
    const opts = {
      reply_markup: {
        inline_keyboard: [
          subButton,
          [{ text: '❓ Как пользоваться?', callback_data: 'help' }],
        ],
      },
      parse_mode: 'HTML',
    };

    // отправляем сообщение с инструкциями по оплате
    await bot.sendMessage(
      chatId,
      `Привет!\n\nДобро пожаловать в нашего умного помощника для решений заданий и тестов. Наш бот использует современные алгоритмы и искусственный интеллект, чтобы помочь школьникам и студентам максимально эффективно готовиться к экзаменам и творчески работать над своим развитием.\n\nПодписка на месяц всего за 200 рублей даст Вам неограниченный доступ к функциям бота, которые обеспечат помощь в выполнении тестов и заданий. Начните сегодня и получите неограниченный доступ к знаниям и информации каждый день!\n\n<b>${
        user?.isActivated
          ? `Подписка действительна до <b>${utils.convertStampDate(
              user.activationDate + MONTH
            )}</b>`
          : 'Осталось пробных вопросов: ' + user.freeTry
      }</b>`,
      opts
    );
  });

  async function createPayment(phone) {
    try {
      // создаем платеж в ЮMoney
      const payment = await checkout.createPayment({
        amount: {
          value: 200,
          currency: 'RUB',
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: 'https://t.me/easy_answer_bot', // страница успешной оплаты
        },
        save_payment_method: false,
        description: 'Оформление подписки на бота',
        receipt: {
          customer: {
            phone: phone,
          },
          items: [
            {
              amount: {
                value: 200,
                currency: 'RUB',
              },
              description: 'Подписка на бота на 1 месяц',
              quantity: 1,
              vat_code: 1,
            },
          ],
        },
      });

      // возвращаем ссылку на оплату
      return payment;
    } catch (e) {
      console.error(e);
    }
  }

  // обработчик нажатия на кнопку "Подписаться"
  bot.on('callback_query', async (query) => {
    // Получение информации о статусе платежа
    const chatId = query.message.chat.id;
    var user = await findOrCreateUser(query.message);
    if (query.data.includes('check_pay_')) {
      try {
        if (user.isActivated) {
          await bot.answerCallbackQuery(
            query.id,
            `У вас уже оформлена подписка до ${utils.convertStampDate(
              user.activationDate + MONTH
            )}`,
            true
          );
          return;
        }
        const paymentId = query.data.split('_')[2];
        console.log(paymentId);
        const paymentInfo = await checkout.getPayment(paymentId);
        console.log(paymentInfo);
        if (paymentInfo.status === 'succeeded') {
          const nowDate = Date.now() / 1000;
          const user = await userService.update(
            {
              userId: chatId,
            },
            {
              $set: {
                isActivated: true,
                activationDate: nowDate,
              },
              $unset: { paymentId },
            }
          );
          console.log(user);
          const pay = await createPay(
            query.message,
            paymentInfo,
            user?.refName
          );
          await bot.sendMessage(
            chatId,
            `<b>Подписка успешно оформлена!</b>\n\nПодписка действительная до <b>${utils.convertStampDate(
              user.activationDate + MONTH
            )}</b>`,
            { parse_mode: 'HTML' }
          );
          await bot.answerCallbackQuery(
            query.id,
            `Подписка успешно оформлена!`,
            false
          );
          if (user.refName) {
            //Нужно куда-то отстрелять лид
            const chat = await chatService.findOne({ ref: user.refName });
            const subCount = await payService.findCount({
              refName: user.refName,
              refClear: false,
            });
            if (!chat) return;
            await bot.sendMessage(
              chat.chatId,
              `По вашему реферальному коду <b>${user.refName}</b> прошла оплата подписки!\n\nПользователь: ${user.username}, ID: ${user.userId}\n\nВсего подписок: ${subCount}`,
              { parse_mode: 'HTML' }
            );
          }
        }
        if (paymentInfo.status === 'pending') {
          await bot.answerCallbackQuery(
            query.id,
            `Подписка еще не оплачена! Кликните на ссылку и оплатите подписку!`,
            true
          );
        }
        if (paymentInfo.status === 'waiting_for_capture') {
          await bot.answerCallbackQuery(
            query.id,
            `Платеж ожидает подтверждения`,
            true
          );
        }
        if (paymentInfo.status === 'canceled') {
          await bot.answerCallbackQuery(query.id, 'Платеж отменен!', true);
        }
      } catch (e) {
        console.log(e);
      }
    }
    if (query.data === 'help') {
      await bot.sendMessage(
        chatId,
        'Задавай любой <b>вопрос</b> или <b>математическое выражение</b>, также бот может писать <b>сочинения</b> и <b>решать тесты</b>!\n\n<b>Например:</b>',
        { parse_mode: 'HTML' }
      );
      await utils.sleep(500);
      await bot.sendMessage(chatId, 'Какая столица в Австралии?');
      await utils.sleep(500);
      await bot.sendMessage(
        chatId,
        'Напиши сочинение на тему Моя родина. Используй природу России как основной смысл сочинения.'
      );
      await utils.sleep(500);
      await bot.sendMessage(
        chatId,
        'Реши уравнение 3*(x - 4) + 12*(2x + 2) = 14'
      );
      await utils.sleep(500);
      await bot.sendMessage(
        chatId,
        'Какая ситуация является примером гражданских правоотношений?\nа) Гражданка Р. была ограничена в родительских правах\nб) Гражданина Л. уволили с работы из-за несоответствия занимаемой должности\nв) Гражданин И. появился в нетрезвом виде в кинотеатре\nг) Гражданин Д. заключил договор аренды с администрацией завода'
      );
    }
    if (query.data === 'request_contact') {
      const opts = {
        reply_markup: {
          keyboard: [
            [
              {
                text: 'Поделиться контаком',
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      };

      // запрашиваем у пользователя контакт
      await bot.sendMessage(
        query.message.chat.id,
        'Пожалуйста, нажмите на кнопку "Поделиться контаком", чтобы продолжить. Номер телефона необходим для формирования чека.',
        opts
      );
    }
    if (query.data === 'subscribe') {
      try {
        if (user.isActivated) {
          await bot.answerCallbackQuery(
            query.id,
            `У вас уже оформлена подписка до ${utils.convertStampDate(
              user.activationDate + MONTH
            )}`,
            true
          );
          return;
        }
        let paymentInfo;
        let paymentLink;
        if (!user.paymentId) {
          const payment = await createPayment(user.phone);
          const newUser = await userService.update(
            {
              _id: user._id,
            },
            { paymentId: payment.id }
          );
          paymentInfo = await checkout.getPayment(newUser.paymentId);
        } else {
          paymentInfo = await checkout.getPayment(user.paymentId);
        }
        if (paymentInfo.status == 'canceled') {
          const payment = await createPayment(user.phone);
          const newUser = await userService.update(
            {
              _id: user._id,
            },
            { paymentId: payment.id }
          );
          paymentLink = payment.confirmation.confirmation_url;
          paymentInfo = await checkout.getPayment(payment.id);
        } else {
          paymentLink = paymentInfo.confirmation.confirmation_url;
        }
        const opts = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Проверить оплату',
                  callback_data: 'check_pay_' + paymentInfo.id,
                },
              ],
            ],
          },
          parse_mode: 'HTML',
        };
        await bot.sendMessage(chatId, `Ссылка на оплату: ${paymentLink}`, opts);
        await bot.answerCallbackQuery(query.id);
      } catch (e) {
        console.log(e);
        await bot.sendMessage(
          chatId,
          'Произошла ошибка. Попробуйте повторить позже.'
        );
      }
    }
  });

  bot.on('contact', async (contact) => {
    console.log(contact);
    const chatId = contact.chat.id;
    const phone = contact.contact.phone_number;
    var user = await findOrCreateUser(contact);
    const newUser = await userService.update(
      {
        _id: user._id,
      },
      { phone }
    );
    const opts = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔒 Оформить подписку', callback_data: 'subscribe' }],
        ],
      },
      parse_mode: 'HTML',
    };
    await bot.sendMessage(
      chatId,
      `Номер телефона получен, теперь Вы можете оформить подписку!`,
      opts
    );
    // Здесь можно сохранить номер телефона в базе данных или выполнять другие действия
  });
}

export default initBot;
