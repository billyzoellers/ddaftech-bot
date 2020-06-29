/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = (controller) => {
  controller.hears(new RegExp(/^help$/), 'message,direct_message', async (bot, message) => {
    let text = 'Here are some things I can help with:';
    text += '<br />`help` - get help';
    text += '<br />`about` - find out about me, *ddaftech@webex.bot*';
    text += '<br />`/mv` - Meraki MV camera demo';
    text += '<br />`/cw <command>` - ConnectWise';
    text += '<br />`/tools <command>` - Useful tools';

    await bot.reply(message, { markdown: text });

  // controller
  });

  controller.hears(['about', 'who are you', 'who'], 'message,direct_message', async (bot, message) => {
    const text = 'Hello! I am ddaftech@webex.bot! I live in the lab at Sterlington Rd, and I only respond if you have an @ddaftech.com e-mail address.<br />I can `help` with many technology related issues.';

    await bot.reply(message, { markdown: text });
  // controller
  });

  controller.hears(new RegExp(/^\/cw help$/), 'message,direct_message', async (bot, message) => {
    let text = '**ConnectWise tools**<br />You must have a ConnectWise account to use these commands. Many of these commands will result in live (client facing) changes being made to ConnectWise. *Proceed with caution*.';
    text += '<hr />`/cw <ticket-number>` - get information about a ticket';
    text += '<br />`/cw mytickets` - get 10 recently updated tickets';
    text += '<br />`/cw mytickets <username>` - get 10 recently updated tickets for specific user';

    await bot.reply(message, { markdown: text });
  // controller
  });

  controller.hears(new RegExp(/^\/tools help$/), 'message,direct_message', async (bot, message) => {
    let text = '**Useful tools**<br />Use these commands to lookup data from the internet.';
    text += '<hr />`/tools ip <ip-address>` - get information about an IP address (from ipinfo.io)';
    text += '<br />`/tools rdns <ip-address>` - get reverse DNS lookup (from ipinfo.io)';

    await bot.reply(message, { markdown: text });
  // controller
  });

  controller.on('message,direct_message', async (bot, message) => {
    const text = 'I can\'t help with that. Try `help` to find out what I can do.;';

    await bot.reply(message, { markdown: text });
  // controller
  });
};
