/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {

    controller.hears(new RegExp(/^\/tools ip (.*?)$/),'message,direct_message', async(bot, message) => {
        
        // connect to the ipinfo.io API
        const api = require("ipinfo");
        
        console.log("tools-ip.js: user requested " + message.matches[1])
        var ip = message.matches[1];
        var token = process.env.IPINFO_TOKEN;
        var text = "text";
        
        // create a Promise wrapper around this API
        let callAPI = (ip) => {
            return new Promise((resolve, reject) => {
                api(ip, token, (err, cLoc) => {
                    
                    if (err) {
                        reject(err);
                    }
        
                    resolve(cLoc);
                });
            })
        };
        
        // wait for API, then respond
        let result = await callAPI(ip);
        if (result.ip == undefined) {
            text = "I was not able to find information about that IP address."
        } else {
            text = result.ip + " is from " + result.org + "<em> (" + result.city + ", " + result.region + " " + result.country + ")</em>.";
        }

        await bot.reply(message, {markdown: text});
        
    // controller
    });

}
