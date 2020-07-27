/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ConnectWiseRest = require('connectwise-rest');
const util = require('util');
const mongoose = require('mongoose');

const actemplates = require('./lib/actemplates');

module.exports = (controller) => {
  controller.hears(new RegExp(/^\/cw tickets(?:$|\s)($|\S+)/), 'message,direct_message', async (bot, message) => {
    let operation = message.matches[1];
    if (!operation) {
      // set owner to user who sent the message
      [operation] = message.personEmail.split('@');
    }
    console.log('/cw-listtickets.js: requested list of tickets for space');

    // find the company(s) this room has alerts for
    const Notification = mongoose.model('Notification');
    let notify = await Notification.find({ room_id: message.channel, company_id: { $ne: null } });

    if (notify.length !== 1) {
      const text = `This command only works in rooms that are connected to a single ConnectWise company. This space is room is connected to ${notify.length} companies.`;

      await bot.reply(message, text);
      return;
    }
    [notify] = notify;

    // Connect to CW API
    const cw = new ConnectWiseRest({
      companyId: process.env.CW_COMPANY,
      companyUrl: 'connectwise.deandorton.com',
      clientId: process.env.CW_CLIENTID,
      publicKey: process.env.CW_PUBLIC_KEY,
      privateKey: process.env.CW_PRIVATE_KEY,
      debug: false, // optional, enable debug logging
    });

    // Make API requests for ticket and company data
    const params = {
      conditions: `company/id=${notify.company_id} AND status/name NOT CONTAINS '>'`,
      orderby: 'dateEntered desc',
      pageSize: '30',
    };

    let company;
    try {
      company = await cw.CompanyAPI.Companies.getCompanyById(notify.company_id);
    } catch (e) {
      console.error(e);
    }

    let ticketCount = 0;
    try {
      ticketCount = await cw.ServiceDeskAPI.Tickets.getTicketsCount(params);
    } catch (e) {
      console.log(`cw-mytickets.js: error on getTicketsCount with company ${notify.company_id}`);
      console.error(e);

      const text = `Sorry, I'm having trouble with that. <em> ${e.message} (${e.code})</em>`;
      await bot.reply(message, { markdown: text });

      return;
    }

    console.log(`/cw-listtickets.js: found ${ticketCount.count} for ${notify.company_id}`);
    if (ticketCount.count === 0) {
      const text = `I wasn't able to find any tickets with company ${notify.company_id}`;
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
      console.log(`cw-mytickets.js: error on getTickets with company ${notify.company_id}`);
      console.error(e);

      const text = `Sorry, I'm having trouble with that. <em> ${e.message} (${e.code})</em>`;
      await bot.reply(message, { markdown: text });

      return;
    }

    // Create the text version of the message
    const text = `Most Recently Updated ${ticketList.length} out of ${ticketCount.count} tickets for ${company.name}`;

    // apply adaptive card template
    const template = actemplates.acTemplate(actemplates.ticketList);
    const context = actemplates.acEvaluationContext({
      tickets: ticketList,
      allTicketsCount: ticketCount.count,
      forEntity: company.name,
    });

    const cardAttach = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: template.expand(context),
    };

    if (process.env.DEBUG) {
      console.log(util.inspect(JSON.stringify(cardAttach.content), false, null, true /* colors */));
    }

    const length = text.length + JSON.stringify(cardAttach).length;
    console.log(`/cw-listtickets.js: post length in chars ${length}`);

    try {
      await bot.reply(message, { markdown: text, attachments: cardAttach });
    } catch (e) {
      console.error(e);
    }

  // controller
  });
};
