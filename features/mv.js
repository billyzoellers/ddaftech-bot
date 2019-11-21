/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {

    controller.hears('/mv','message,direct_message', async(bot, message) => {
        
        // Use adaptive cards templating
        var ACData = require("adaptivecards-templating");
        
        var templatePayload = {
            "type": "AdaptiveCard",
            "version": "1.1",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "{description}"
                },
                {
                    "type": "Input.ChoiceSet",
                    "placeholder": "select camera",
                    "choices": [
                        {
                            "$data": "{cameras}",
                            "title": "{name}",
                            "value": "{serial}"
                        }
                    ],
                    "id": "mv_list_serial"
                }
            ],
            "actions": [
                {
                    "type": "Action.Submit",
                    "title": "Snapshot",
                    "data": {
                        "id": "submit_mv_list_snapshot",
                    }
                },
                {
                    "type": "Action.Submit",
                    "title": "More Info",
                    "data": {
                        "id": "submit_mv_list_info",
                    }
                }
            ]
        };
        
        var template = new ACData.Template(templatePayload);
        
        // Connect to Meraki API
        const meraki = require('meraki');
        const configuration = meraki.Configuration;
        configuration.xCiscoMerakiAPIKey = process.env.MERAKI_TOKEN;
        
        // Meraki network ID with cameras
        let networkId = "N_591660401045840345";
        
        // Make request to Meraki API
        try {
            var cameraList = await meraki.DevicesController.getNetworkDevices(networkId);

            console.log('meraki-listcameras.js: Meraki API call success');
        } catch(e) {
            console.log('meraki-listcameras.js: Meraki API call error');
            console.log(e);
        }

        let context = new ACData.EvaluationContext();
        context.$root = {
            "description": "Please select a camera",
            "cameras": cameraList
        };

        let card_attach = {
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": template.expand(context)
        }
        
        let text = "<small>Please update your Webex Teams app to view this content.</small>";
        await bot.reply(message, {markdown: text, attachments: card_attach});
        
    // controller
    });

}
