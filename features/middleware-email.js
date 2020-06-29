module.exports = (controller) => {
  controller.middleware.ingest.use(async (bot, message, next) => {
    if (message.type === 'self_message' || message.type === 'attachmentActions' || message.type === 'messages.deleted') {
      next();
      return;
    }

    const { PERMITTED_DOMAIN } = process.env;
    const emailDomain = message.personEmail.split('@')[1];

    if (emailDomain === PERMITTED_DOMAIN) {
      next();
      return;
    }

    console.log('MESSAGE FROM EXTERNAL USER');
    message.type = 'external_user_message'; // eslint-disable-line no-param-reassign

    next();
  });

  controller.on('external_user_message', async(bot, message) => {
    const text = 'Sorry, I am only available for the technology team.';
    await bot.reply(message, text);
  });
};
