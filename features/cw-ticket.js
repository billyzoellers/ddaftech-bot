/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const mongoose = require('mongoose');
const cwticket = require('../tools/cw-ticket');

module.exports = (controller) => {
  controller.on('ticket_webhook', async (bot, data) => {
    const { ticketId } = data;
    const { action } = data;

    console.log(`/cw-ticket.js: ticket_webhook for ticket ${ticketId}`);

    let response;
    // get a message from Connectwise
    try {
      response = await cwticket.getMessageForTicket(ticketId, { action });
    } catch (e) {
      return;
    }

    const companyId = response.ticket.company.id;
    const boardId = response.ticket.board.id;
    const statusId = response.ticket.status.id;

    console.log(`CompanyId: ${companyId} ${response.ticket.company.name} BoardId: ${boardId} ${response.ticket.board.name} StatusId: ${statusId} ${response.ticket.status.name}`);
    // do not send message for tickets in closed or assigned status
    if (response.ticket.status.name === 'Assigned' || response.ticket.status.name === '>Closed') {
      console.log(`/cw-ticket.js: ticket status is ${response.ticket.status.name}, not sending message`);
    } else {
      /* DB search
       *
       */
      const Notification = mongoose.model('Notification');
      const searchParam = [];
      searchParam[0] = { company_id: companyId };
      searchParam[1] = { company_id: null, board_id: boardId };
      searchParam[2] = { company_id: null, board_id: null };

      let roomId = null;
      for (let i = 0; i < searchParam.length && !roomId; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const search = await Notification.find(searchParam[i]);

        if (search.length === 1) {
          console.log(`/cw-ticket.js: matched CompanyId ${searchParam[i].companyId} BoardId ${searchParam[i].boardId}`);
          roomId = search[0].room_id;
        }
      }

      if (!roomId) {
        console.log('/cw-ticket.js: no match for Notification, not sending message');
        return;
      }

      await bot.startConversationInRoom(roomId);

      // send the message
      try {
        await bot.say({ markdown: response.text, attachments: response.card });
      } catch (e) {
        console.error(e);
      }
    }
  });

  controller.hears(new RegExp(/^\/cw(?:\s|ticket)*(\d+)(?:$|\s)($|\S+)/), 'message,direct_message', async (bot, message) => {
    const ticketId = message.matches[1];
    console.log(`/cw-ticket.js: requested ticket ${ticketId}`);

    let response;
    try {
      response = await cwticket.getMessageForTicket(ticketId, {});
    } catch (e) {
      console.log('cw-ticket.js: error in tools.GetMessageForTicket()');

      const text = `Sorry, I wasn't able to help with that. ${e.message}.`;
      await bot.say({ markdown: text });
      return;
    }

    // send the message
    try {
      await bot.replyInThread(message, { markdown: response.text, attachments: response.card }); // eslint-disable-line max-len
    } catch (e) {
      console.error(e);
    }

  // controller
  });
};
