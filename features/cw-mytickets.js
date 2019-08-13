/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {
    
    const tools = require('../tools/connectwise');

    controller.hears(new RegExp(/^\/cw mytickets(?:$|\s)($|\S+)/),'message,direct_message', async(bot, message) => {
        
        let owner_identifier = message.matches[1];
        
        console.log('/cw-mytickets.js: requested list of tickets for ' + owner_identifier);
        
        // Connect to CW API
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
        
        if (!owner_identifier) {
            // set owner to user who sent the message
            
            owner_identifier = message.personEmail.split("@")[0];
            
        }
        
        // Make API requests for ticket data
        var params = {
          "conditions": "owner/identifier='" + owner_identifier + "' AND status/name > '>Closed'",
          "orderby": "_info/lastUpdated desc",
          "pageSize": "10"
        }
        
        try {
            var ticketCount = await cw.ServiceDeskAPI.Tickets.getTicketsCount(params);
        }catch(e) {
            console.log("cw-mytickets.js: error on getTicketsCount with owner " + owner_identifier);
            console.error(e);
            
            let text = "Sorry, I'm having trouble with that." + "<em> "
            text += e.message + " (" + e.code + ")</em>"
            await bot.reply(message, {markdown: text});
        
            return;
        }
        
        console.log("/cw-mytickets.js: found " + ticketCount.count + " for " + owner_identifier);
        if (ticketCount.count == 0) {
            
            let text = "I wasn't able to find any tickets assiged to " + owner_identifier;
            try {
                await bot.reply(message, {markdown: text});
                
                return;
            } catch(e) {
                console.error(e);
            }
        }
        
        try {
            var ticketList = await cw.ServiceDeskAPI.Tickets.getTickets(params);
        }catch(e) {
            console.log("cw-mytickets.js: error on getTickets with owner " + owner_identifier);
            console.error(e);
            
            let text = "Sorry, I'm having trouble with that." + "<em> "
            text += e.message + " (" + e.code + ")</em>"
            await bot.reply(message, {markdown: text});
        
            return;
        }
        
        // Create the text version of the message
        let text = "<small>This is the <em>mobile</em> version. For better formatting, use the Webex desktop or web client.</small><ul>"
        
        // Create  the Adaptive Card version of the message
        let card_body = [];
        
        // add footer
        card_body.push({
            "type": "Container",
            "spacing": "Large",
            "items": [
                {
                    "type": "TextBlock",
                    "text": "Most Recently Updated " + ticketList.length + ( ticketCount.count > 10 ? " of " + ticketCount.count : "") + " tickets for " + owner_identifier,
                    "size": "Small"
                }
            ],
        });
        
        // add comments heading       
        card_body.push({
            "type": "Container",
            "spacing": "Large",
            "style": "emphasis",
            "items": [
                {
                    "type": "ColumnSet",
                    "columns": [
                        {
                            "type": "Column",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "weight": "Bolder",
                                    "text": "ID"
                                }
                            ],
                            "width": 10
                        },
                        {
                            "type": "Column",
                            "spacing": "Large",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "weight": "Bolder",
                                    "text": "REQUESTER"
                                }
                            ],
                            "width": 75
                        },
                        {
                            "type": "Column",
                            "spacing": "Large",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "weight": "Bolder",
                                    "text": "STATUS",
                                    "horizontalAlignment": "Right"
                                }
                            ],
                            "width": 15
                        }
                    ]
                }
            ],
            "bleed": true
        });
        
        // create line for each ticket
        for (let i = 0; i < ticketList.length; i++) {
            // add to text version
            text += "<li><strong>#" + ticketList[i].id.toString() + ":</strong> " + ticketList[i].summary + "</li>"
            
            // push to adaptive card
            card_body.push({
                "type": "Container",
                "style": "Emphasis",
                "wrap": false,
                "items": [
                    {
                        "type": "ColumnSet",
                        "spacing": "None",
                        "columns": [
                            {
                                "type": "Column",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text":  "#" + ticketList[i].id.toString(),
                                        "wrap": false,
                                        "weight": "Lighter",
                                        "size": "Small",
                                        "color": "Accent"
                                    }
                                ],
                                "width": 10
                            },
                            {
                                "type": "Column",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text": "[" + ticketList[i].contactName + "](" + ticketList[i].contactEmailAddress + ") at " +  ticketList[i].company.name.substring(0,33) +  ( ticketList[i].company.name.length > 33 ? "..." : ""),
                                        "wrap": false,
                                        "weight": "Lighter",
                                        "size": "Small"
                                    }
                                ],
                                "width": 75
                            },
                            {
                                "type": "Column",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text": tools.formatStatus(ticketList[i].status.name),
                                        "wrap": false,
                                        "weight": "Lighter",
                                        "size": "Small",
                                        "horizontalAlignment": "Right",
                                        "color": "Accent"
                                    }
                                ],
                                "width": 15
                            }
                        ]
                    },
                    {
                        "type": "TextBlock",
                        "text": ticketList[i].summary,
                        "wrap": false,
                        "weight": "Lighter",
                        "size": "Small"
                    }
                ]
            });
            
        }
        
        text += "</ul>";

        // add headers to card before attaching
        let card_attach = {
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.0",
                "body": card_body
            }
        }

        try {
            await bot.reply(message, {markdown: text, attachments: card_attach});
        } catch(e) {
            console.error(e);
        }
        
    // controller
    });

}