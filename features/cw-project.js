/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ConnectWiseRest = require('connectwise-rest');
const cards = require('../lib/cards');

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

    // Make API request for data
    let project = null;
    let tickets = null;
    try {
      project = await cw.ProjectAPI.Projects.getProjectById(projectId);
      tickets = await cw.ServiceDeskAPI.Tickets.getTickets({
        conditions: `project/id=${project.id}`,
      });
    } catch (e) {
      console.log(`connectwise.js: error in getMessageForProject using project ID ${projectId}`);
      console.error(e);

      // TODO: bot reply 'unable to get data from connectwise'
    }

    // Create text message
    const text = `Project #${project.id}: ${project.name}`;

    // Create 'Project Ticket' card
    const template = cards.template(cards.project_ticket);
    const context = cards.context({
      project,
      tickets,
    });
    const card = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: template.expand(context),
    };

    try {
      // eslint-disable-next-line max-len
      await bot.reply(message, { markdown: text, attachments: card });
    } catch (e) {
      console.error('cw-project.js: ERROR in bot.reply()');
      console.error(e);
    }

  // controller
  });
};
