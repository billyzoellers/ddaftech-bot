/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ConnectWiseRest = require('connectwise-rest');
const mongoose = require('mongoose');

const cards = require('../lib/cards');

module.exports = (controller) => {
  controller.hears('/cw notifications', 'message', async (bot, message) => {
    // create API connection to CW
    const cw = new ConnectWiseRest({
      companyId: process.env.CW_COMPANY,
      companyUrl: 'connectwise.deandorton.com',
      clientId: process.env.CW_CLIENTID,
      publicKey: process.env.CW_PUBLIC_KEY,
      privateKey: process.env.CW_PRIVATE_KEY,
      debug: false, // optional, enable debug logging
    });

    // find notifications for this space
    const Notification = mongoose.model('Notification');
    const notify = await Notification.find({ room_id: message.channel });
    console.log(`cw-notify.js: found ${notify.length} notifications for room ${message.channel}`);
    // Get friendly names for companies via CW and Teams API
    const currentNotifications = [];
    for (let i = 0; i < notify.length; i += 1) {
      // specific company notification
      if (notify[i].company_id) {
        // eslint-disable-next-line no-await-in-loop
        const company = await cw.CompanyAPI.Companies.getCompanyById(notify[i].company_id);

        currentNotifications.push({
          key: 'Company',
          value: company.name,
          id: notify[i]._id,
        });
      // board fallback notification
      } else if (notify[i].board_id) {
        // eslint-disable-next-line no-await-in-loop
        const board = await cw.ServiceDeskAPI.Boards.getBoardById(notify[i].board_id);

        currentNotifications.push({
          key: 'Fallback',
          value: `Board ${board.name}`,
          id: notify[i]._id,
        });
      // global fallback notification
      } else {
        currentNotifications.push({
          key: 'Fallback',
          value: 'All notifications',
          id: notify[i]._id,
        });
      }
    }

    const thisRoom = await bot.api.rooms.get(message.channel);

    // Create 'list of tickets' card
    const template = cards.template(cards.notification_addremove);
    const context = cards.context({
      spaceName: thisRoom.title,
      currentNotifications,
    });
    const card = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: template.expand(context),
    };

    const text = `List of notifications for '${thisRoom.title}'`;
    await bot.reply(message, { markdown: text, attachments: card });

  // controller
  });
};
