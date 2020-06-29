/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ACData = require('adaptivecards-templating');
const meraki = require('meraki');

module.exports = (controller) => {
  controller.hears('/mv', 'message,direct_message', async (bot, message) => {
    const templatePayload = {
      type: 'AdaptiveCard',
      version: '1.1',
      body: [
        {
          type: 'TextBlock',
          text: '{description}',
        },
        {
          type: 'Input.ChoiceSet',
          placeholder: 'select camera',
          choices: [
            {
              $data: '{cameras}',
              title: '{name}',
              value: '{serial}',
            },
          ],
          id: 'mv_list_serial',
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Snapshot',
          data: {
            id: 'submit_mv_list_snapshot',
          },
        },
        {
          type: 'Action.Submit',
          title: 'More Info',
          data: {
            id: 'submit_mv_list_info',
          },
        },
      ],
    };

    const template = new ACData.Template(templatePayload);

    // Connect to Meraki API
    const configuration = meraki.Configuration;
    configuration.xCiscoMerakiAPIKey = process.env.MERAKI_TOKEN;

    // Meraki network ID with cameras
    const networkId = 'N_591660401045840345';

    // Make request to Meraki API
    try {
      const cameraList = await meraki.DevicesController.getNetworkDevices(networkId);

      const context = new ACData.EvaluationContext();
      context.$root = {
        description: 'Please select a camera',
        cameras: cameraList,
      };

      const cardAttach = {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: template.expand(context),
      };

      const text = '<small>Please update your Webex Teams app to view this content.</small>';
      await bot.reply(message, { markdown: text, attachments: cardAttach });

      console.log('meraki-listcameras.js: Meraki API call success');
    } catch (e) {
      bot.say('Sorry, something went wrong');
      console.log('meraki-listcameras.js: Meraki API call error');
      console.log(e);
    }

  // controller
  });
};
