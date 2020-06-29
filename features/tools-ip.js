/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const ipinfo = require('ipinfo');

module.exports = (controller) => {
  controller.hears(new RegExp(/^\/tools ip (.*?)$/), 'message,direct_message', async (bot, message) => {
    console.log(`tools-ip.js: user requested ${message.matches[1]}`);
    const token = process.env.IPINFO_TOKEN;

    // create a Promise wrapper around this API
    const callAPI = (ip) => new Promise((resolve, reject) => {
      ipinfo(ip, token, (err, cLoc) => {
        if (err) {
          reject(err);
        }

        resolve(cLoc);
      });
    });

    // wait for API, then respond
    const result = await callAPI(message.matches[1]);
    if (result.org === undefined) {
      const text = 'I was not able to find information about that IP address.';
      await bot.reply(message, { markdown: text });
    } else {
      const text = `${result.ip} is from ${result.org} <em>(${result.city}, ${result.region} ${result.country})</em>.`;
      await bot.reply(message, { markdown: text });
    }

  // controller
  });
};
