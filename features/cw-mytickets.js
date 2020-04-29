/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {
    
    const utility = require('../tools/utility');

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
          "pageSize": "30"
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
        let text = "Tickets list"
        
        // Use adaptive cards templating
        var ACData = require("adaptivecards-templating");
        
        // template for ServiceTicket
        var templatePayload = {
            "type": "AdaptiveCard",
            "version": "1.1",
            "body": [
                {
                    "type": "Container",
                    "spacing": "Large",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Most Recently Updated {tickets.length} out of {allTicketsCount} tickets for {userName}",
                            "size": "Small"
                        }
                    ],
                },
                {
                    "type": "Container",
                    "spacing": "Large",
                    "style": "emphasis",
                    "bleed": true,
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
                    ]
                },
                {
                    "type": "Container",
                    "style": "emphasis",
                    "bleed": true,
                    $data: "{tickets}",
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
                                            "text":  "#{toString(id)}",
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
                                            "text": "[{contactName}]({contactEmailAddress}) at {shorten(company.name,33)}",
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
                                            "text": "{friendlyStatusName(status,0)}",
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
                            "text": "{summary}",
                            "wrap": false,
                            "weight": "Lighter",
                            "size": "Small"
                        }
                    ]
                }
                
                
            ]
        };
        
        var template = new ACData.Template(templatePayload);
        
        let context = new ACData.EvaluationContext();
        context.$root = {
            "tickets": ticketList,
            "allTicketsCount": ticketCount.count,
            "userName": owner_identifier
        };
        
        context.registerFunction(
          "friendlyStatusName",
          (status,currentStatusId) => {
              let text = status.name.replace('>','');
              
              if (status.id == currentStatusId) {
                text += " (current status)";
              }

              return text;
          }
        );
        
         context.registerFunction(
            "toString",
            (input) => {
                return input.toString();
            }
        );
        
        context.registerFunction(
            "toUpperCase",
            (input) => {
              return input.toUpperCase();
            }
        );
        
        context.registerFunction(
            "shorten",
            (string,length) => {
                return string.substring(0,33) +  ( string.length > length ? "..." : "");
            }
        );

        let card_attach = {
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": template.expand(context)
        }
        
        if (process.env.DEBUG) {
            const util = require('util');
            console.log(util.inspect(JSON.stringify(card_attach.content), false, null, true /* enable colors */))
        }
        
        let length = text.length + JSON.stringify(card_attach).length;
        console.log("/cw-mytickets.js: post length in chars " + length)

        try {
            await bot.reply(message, {markdown: text, attachments: card_attach});
        } catch(e) {
            console.error(e);
        }
        
    // controller
    });

}