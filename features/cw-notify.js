/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ACData = require('adaptivecards-templating');
const ConnectWiseRest = require('connectwise-rest');
const mongoose = require('mongoose');

module.exports = (controller) => {
  controller.hears('/cw notifications', 'message', async (bot, message) => {
    const templatePayload = {
      type: 'AdaptiveCard',
      version: '1.1',
      body: [
        {
          type: 'TextBlock',
          size: 'Medium',
          weight: 'Bolder',
          text: 'Notifications for \'{spaceName}\'',
        },
        {
          type: 'FactSet',
          facts: [
            {
              $data: '{currentNotifications}',
              title: '{key}:',
              value: '{value}',
            },
          ],
          $when: '{currentNotifications.length > 0}',
        },
      ],
      actions: [
        {
          type: 'Action.ShowCard',
          title: 'New',
          card: {
            type: 'AdaptiveCard',
            body: [
              {
                type: 'Input.Text',
                id: 'company_name',
                placeholder: 'Company Name',
              },
            ],
            actions: [
              {
                type: 'Action.Submit',
                title: 'Add',
                data: {
                  id: 'add_cw_notification',
                },
              },
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          },
        },
        {
          type: 'Action.ShowCard',
          title: 'Edit',
          card: {
            type: 'AdaptiveCard',
            body: [
              {
                type: 'Input.ChoiceSet',
                placeholder: 'select camera',
                choices: [
                  {
                    $data: '{currentNotifications}',
                    title: '{value}',
                    value: '{id}',
                  },
                ],
                id: 'cw_notifications_edit',
              },
            ],
            actions: [
              {
                type: 'Action.Submit',
                title: 'Delete',
                data: {
                  id: 'delete_cw_notification',
                },
              },
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          },
          $when: '{currentNotifications.length > 0}',
        },
      ],
    };

    const template = new ACData.Template(templatePayload);

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

    const context = new ACData.EvaluationContext();
    context.$root = {
      spaceName: thisRoom.title,
      currentNotifications,
    };

    const cardAttach = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: template.expand(context),
    };

    const text = `List of notifications for '${thisRoom.title}'`;
    await bot.reply(message, { markdown: text, attachments: cardAttach });

  // controller
  });
};
