/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {

    controller.hears('/cw notifications','message', async(bot, message) => {
        
        // Use adaptive cards templating
        var ACData = require("adaptivecards-templating");
        
        var templatePayload = {
            "type": "AdaptiveCard",
            "version": "1.1",
            "body": [
                {
                    "type": "TextBlock",
                    "size": "Medium",
                    "weight": "Bolder",
                    "text": "Notifications for '{spaceName}'"
                },
                {
                    "type": "FactSet",
                    "facts": [
                        {
                            "$data": "{currentNotifications}",
                            "title": "{key}:",
                            "value": "{value}"
                        }
                    ],
                    "$when": "{currentNotifications.length > 0}"
                }
            ],
            "actions": [
                {
                    "type": "Action.ShowCard",
                    "title": "New",
                    "card": {
                        "type": "AdaptiveCard",
                        "body": [
                            {
                                "type": "Input.Text",
                                "id": "company_name",
                                "placeholder": "Company Name"
                            }
                        ],
                        "actions": [
                            {
                                "type": "Action.Submit",
                                "title": "Add",
                                "data": {
                                    "id": "add_cw_notification",
                                }
                            }
                        ],
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
                    }
                },
                {
                    "type": "Action.ShowCard",
                    "title": "Edit",
                    "card": {
                        "type": "AdaptiveCard",
                        "body": [
                            {
                                "type": "Input.ChoiceSet",
                                "placeholder": "select camera",
                                "choices": [
                                    {
                                        "$data": "{currentNotifications}",
                                        "title": "{value}",
                                        "value": "{id}"
                                    }
                                ],
                                "id": "cw_notifications_edit"
                            }
                        ],
                        "actions": [
                            {
                                "type": "Action.Submit",
                                "title": "Delete",
                                "data": {
                                    "id": "delete_cw_notification",
                                }
                            }
                        ],
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
                    },
                    "$when": "{currentNotifications.length > 0}"
                }
            ]
        };
        
        var template = new ACData.Template(templatePayload);
        
        // create API connection to CW
        const ConnectWiseRest = require('connectwise-rest');
        const cw = new ConnectWiseRest({
            companyId: process.env.CW_COMPANY,
            companyUrl: 'connectwise.deandorton.com',
            clientId: process.env.CW_CLIENTID,
            publicKey: process.env.CW_PUBLIC_KEY,
            privateKey: process.env.CW_PRIVATE_KEY,
            debug: false,               // optional, enable debug logging
            logger: (level, text, meta) => { } // optional, pass in logging function
        });
        
        // find notifications for this space
        var Notification = require('mongoose').model('Notification');
        let notify = await Notification.find({ room_id: message.channel });
        
        // Get friendly names for companies via CW and Teams API
        let currentNotifications = [];
        for (let i = 0; i < notify.length; i++) {
            // specific company notification
            if (notify[i].company_id) {
                let c = await cw.CompanyAPI.Companies.getCompanyById(notify[i].company_id);
                
                currentNotifications.push({
                    "key": "Company",
                    "value": c.name,
                    "id": notify[i]._id
                });
            // board fallback notification
            } else if (notify[i].board_id) {
                let b = await cw.ServiceDeskAPI.Boards.getBoardById(notify[i].board_id);
                
                currentNotifications.push({
                    "key": "Fallback",
                    "value": "Board " + b.name,
                    "id": notify[i]._id
                });
            // global fallback notification
            } else {
                currentNotifications.push({
                    "key": "Fallback",
                    "value": "<em>All notifications</em>",
                    "id": notify[i]._id
                });
            }
        }
        
        let thisRoom = await bot.api.rooms.get(message.channel);
        
        let context = new ACData.EvaluationContext();
        context.$root = {
            "spaceName": thisRoom.title,
            "currentNotifications": currentNotifications
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
