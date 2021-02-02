/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ConnectWiseRest = require('connectwise-rest');
const cards = require('../lib/cards');

module.exports = (controller) => {
  controller.hears(new RegExp(/^\/cw mytickets(?:$|\s)($|\S+)/), 'message,direct_message', async (bot, message) => {
    let ownerIdentifier = message.matches[1];
    if (!ownerIdentifier) {
      // set owner to user who sent the message
      [ownerIdentifier] = message.personEmail.split('@');
    }
    console.log(`/cw-mytickets.js: requested list of tickets for ${ownerIdentifier}`);

    // Connect to CW API
    const cw = new ConnectWiseRest({
      companyId: process.env.CW_COMPANY,
      companyUrl: 'connectwise.deandorton.com',
      clientId: process.env.CW_CLIENTID,
      publicKey: process.env.CW_PUBLIC_KEY,
      privateKey: process.env.CW_PRIVATE_KEY,
      debug: false, // optional, enable debug logging
    });

    // Make API requests for ticket data
    const params = {
      conditions: `owner/identifier='${ownerIdentifier}' AND status/name NOT CONTAINS '>'`,
      orderby: '_info/lastUpdated desc',
      pageSize: '30',
    };

    let ticketCount = 0;
    try {
      ticketCount = await cw.ServiceDeskAPI.Tickets.getTicketsCount(params);
    } catch (e) {
      console.log(`cw-mytickets.js: error on getTicketsCount with owner ${ownerIdentifier}`);
      console.error(e);

      const text = `Sorry, I'm having trouble with that. <em> ${e.message} (${e.code})</em>`;
      await bot.reply(message, { markdown: text });

      return;
    }

    console.log(`/cw-mytickets.js: found ${ticketCount.count} for ${ownerIdentifier}`);
    if (ticketCount.count === 0) {
      const text = `I wasn't able to find any tickets assiged to ${ownerIdentifier}`;
      try {
        await bot.reply(message, { markdown: text });

        return;
      } catch (e) {
        console.error(e);
      }
    }

    let ticketList;
    try {
      ticketList = await cw.ServiceDeskAPI.Tickets.getTickets(params);
    } catch (e) {
      console.log(`cw-mytickets.js: error on getTickets with owner ${ownerIdentifier}`);
      console.error(e);

      const text = `Sorry, I'm having trouble with that. <em> ${e.message} (${e.code})</em>`;
      await bot.reply(message, { markdown: text });

      return;
    }

    // Create the text version of the message
    const text = `Most Recently Updated ${ticketList.length} out of ${ticketCount.count} tickets for ${ownerIdentifier}`;

    // Create 'list of tickets' card
    const template = cards.template(cards.ticket_list);
    const context = cards.context({
      tickets: ticketList,
      allTicketsCount: ticketCount.count,
      forEntity: ownerIdentifier,
    });
    const card = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: template.expand(context),
    };

    try {
      await bot.reply(message, { markdown: text, attachments: card });
    } catch (e) {
      console.error(e);
    }

  // controller
  });
};
