/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ConnectWiseRest = require('connectwise-rest');
const cwproject = require('../tools/cw-project');

module.exports = (controller) => {
  controller.hears(new RegExp(/^\/cw project|p\s(\d+)$/), 'message,direct_message', async (bot, message) => {
    // create API connection
    const cw = new ConnectWiseRest({
      companyId: process.env.CW_COMPANY,
      companyUrl: 'connectwise.deandorton.com',
      clientId: process.env.CW_CLIENTID,
      publicKey: process.env.CW_PUBLIC_KEY,
      privateKey: process.env.CW_PRIVATE_KEY,
      debug: false, // optional, enable debug logging
    });

    const projectId = message.matches[1];
    console.log(`cw-project.js: requested project ${projectId}`);

    try {
      const messageForProject = await cwproject.getMessageForProject(cw, projectId);

      // send the message
      try {
        // eslint-disable-next-line max-len
        await bot.reply(message, { markdown: messageForProject.text, attachments: messageForProject.card });
      } catch (e) {
        console.error('cw-project.js: ERROR in bot.reply()');
        console.error(e);
      }
    } catch (e) {
      console.error('cw-project.js: ERROR in cwproject.GetMessageForProject()');
      console.error(e);

      const text = `Sorry, I wasn't able to help with that. ${e.message}.`;
      await bot.say({ markdown: text });
    }

  // controller
  });
};
