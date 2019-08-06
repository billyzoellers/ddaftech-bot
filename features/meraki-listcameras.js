/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {

    controller.hears('/mv list cameras','message,direct_message', async(bot, message) => {
        
        // Connect to Meraki API
        const meraki = require('meraki');
        const configuration = meraki.Configuration;
        configuration.xCiscoMerakiAPIKey = process.env.MERAKI_TOKEN;
        
        // Meraki network ID with cameras
        let networkId = "N_591660401045840345";
        
        // Make request to Meraki API
        const promise = meraki.DevicesController.getNetworkDevices(networkId);
        var botreply = await promise.then ((response) => {
            // Successful API call
            let text = "There are " + response.length + " cameras in your network:";
            
            for (var i=0; i < response.length; i++) {
                text += "\n - " + response[i].name;
            }
            
            console.log('meraki-listcameras.js: Meraki API call success');
            return text;
            
        }, (err) => {
           console.log('meraki-listcameras.js: Meraki API call error');
           console.log(err);
        });
        
        await bot.reply(message, botreply);
        
    // controller
    });

}
