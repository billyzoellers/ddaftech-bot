/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ConnectWiseRest = require('connectwise-rest');
const ACData = require('adaptivecards-templating');
const util = require('util');
const mongoose = require('mongoose');

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

    // template for ServiceTicket
    const templatePayload = {
      type: 'AdaptiveCard',
      version: '1.1',
      body: [
        {
          type: 'Container',
          spacing: 'Large',
          items: [
            {
              type: 'TextBlock',
              text: 'Most Recently Created {tickets.length} out of {allTicketsCount} tickets for {forEntity}',
              size: 'Small',
            },
          ],
        },
        {
          type: 'Container',
          spacing: 'Large',
          style: 'emphasis',
          bleed: true,
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  items: [
                    {
                      type: 'TextBlock',
                      weight: 'Bolder',
                      text: 'ID',
                    },
                  ],
                  width: 10,
                },
                {
                  type: 'Column',
                  spacing: 'Large',
                  items: [
                    {
                      type: 'TextBlock',
                      weight: 'Bolder',
                      text: 'REQUESTER',
                    },
                  ],
                  width: 75,
                },
                {
                  type: 'Column',
                  spacing: 'Large',
                  items: [
                    {
                      type: 'TextBlock',
                      weight: 'Bolder',
                      text: 'STATUS',
                      horizontalAlignment: 'Right',
                    },
                  ],
                  width: 15,
                },
              ],
            },
          ],
        },
        {
          type: 'Container',
          style: 'emphasis',
          bleed: true,
          $data: '{tickets}',
          items: [
            {
              type: 'ColumnSet',
              spacing: 'None',
              columns: [
                {
                  type: 'Column',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '#{toString(id)}',
                      wrap: false,
                      weight: 'Lighter',
                      size: 'Small',
                      color: 'Accent',
                    },
                  ],
                  width: 10,
                },
                {
                  type: 'Column',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '[{contactName}]({contactEmailAddress}) at {shorten(company.name,33)}',
                      wrap: false,
                      weight: 'Lighter',
                      size: 'Small',
                    },
                  ],
                  width: 75,
                },
                {
                  type: 'Column',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '{friendlyStatusName(status,0)}',
                      wrap: false,
                      weight: 'Lighter',
                      size: 'Small',
                      horizontalAlignment: 'Right',
                      color: 'Accent',
                    },
                  ],
                  width: 15,
                },
              ],
            },
            {
              type: 'TextBlock',
              text: '{summary}{projectName(project.name)}',
              wrap: false,
              weight: 'Lighter',
              size: 'Small',
            },
          ],
        },
      ],
    };

    const template = new ACData.Template(templatePayload);
    const context = new ACData.EvaluationContext();
    context.$root = {
      tickets: ticketList,
      allTicketsCount: ticketCount.count,
      forEntity: company.name,
    };

    context.registerFunction(
      'friendlyStatusName',
      (status, currentStatusId) => {
        let txt = status.name.replace('>', '');

        if (status.id === currentStatusId) {
          txt += ' (current status)';
        }

        return txt;
      },
    );

    context.registerFunction(
      'toString',
      (input) => input.toString(),
    );

    context.registerFunction(
      'projectName',
      (input) => {
        if (input) {
          return ` - Project: ${input}`;
        }

        return '';
      },
    );

    context.registerFunction(
      'toUpperCase',
      (input) => input.toUpperCase(),
    );

    context.registerFunction(
      'shorten',
      (string, length) => string.substring(0, 33) + (string.length > length ? '...' : ''),
    );

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
