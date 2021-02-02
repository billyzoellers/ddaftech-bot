/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ACData = require('adaptivecards-templating');
const meraki = require('meraki');
const cards = require('../lib/cards');

module.exports = (controller) => {
  controller.hears('/mv', 'message,direct_message', async (bot, message) => {
    // Connect to Meraki API
    const configuration = meraki.Configuration;
    configuration.xCiscoMerakiAPIKey = process.env.MERAKI_TOKEN;

    // Meraki network ID with cameras
    const networkId = 'N_591660401045840345';

    // Make request to Meraki API
    try {
      const cameraList = await meraki.DevicesController.getNetworkDevices(networkId);

      // Create 'select MV' card
      const template = cards.template(cards.merakimv_select);
      const context = cards.context({
        description: 'Please select a camera',
        cameras: cameraList,
      });
      const card = {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: template.expand(context),
      };

      const text = '<small>Please update your Webex Teams app to view this content.</small>';
      await bot.reply(message, { markdown: text, attachments: card });

      console.log('meraki-listcameras.js: Meraki API call success');
    } catch (e) {
      bot.say('Sorry, something went wrong');
      console.log('meraki-listcameras.js: Meraki API call error');
      console.log(e);
    }

  // controller
  });
};
