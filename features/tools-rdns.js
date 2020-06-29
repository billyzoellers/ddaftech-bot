/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ipinfo = require('ipinfo');

module.exports = (controller) => {
  controller.hears(new RegExp(/^\/tools rdns (.*?)$/), 'message,direct_message', async (bot, message) => {
    console.log(`tools-ip.js: user requested ${message.matches[1]}`);
    const token = process.env.IPINFO_TOKEN;

    let text;
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
    if (result.hostname === undefined) {
      text = 'I was not able to find information about that IP address.';
    } else {
      text = `${result.ip} resolves to ${result.hostname}.`;
    }

    await bot.reply(message, { markdown: text });

  // controller
  });
};
