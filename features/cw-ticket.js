/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {

    controller.hears(new RegExp(/^\/cw ticket (\S+)(?:$|\s)($|\S+)/),'message,direct_message', async(bot, message) => {
        
        let ticketId = message.matches[1];
        let operation = message.matches[2];
        
        if (operation == "details" || operation =="d") {
            operation = "detail";
        }
        
        console.log('/cw-ticket.js: requested ticket ' + ticketId + ' operation ' + operation);
        
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
        
        // Make API requests for ticket data
        try {
            var ticket = await cw.ServiceDeskAPI.Tickets.getTicketById(ticketId);
        }catch(e) {
            console.error(e);
        }
        
        try {
            var serviceNotes = await cw.ServiceDeskAPI.ServiceNotes.getServiceNotes(ticketId);
        }catch(e) {
            console.error(e);
        }
        
        // Create the text version of the message
        let text = "<blockquote><h3>Ticket " + ticket.id +  " - " + ticket.summary + "</h3>";
        
        text += "<strong>Status:</strong> " + ticket.status.name;
        
        text += "<br><strong>Requester:</strong> <a href='mailto:" + ticket.contactEmailAddress + "'>" + ticket.contactName + "</a> at " + ticket.company.name;
        
        text += "<br><strong>Assignee:</strong> " + await returnTicketAsignee(ticket);
        
        text += "</blockquote>";

        if (serviceNotes) {
            text += "<hr>";
            
            let i = 0;
            do {
                let formattedNote = serviceNotes[i].text.replace(/\n/g, '<br>');
                
                text += "<strong>" + returnNoteName(serviceNotes[i]) + " on " + dateToHumanReadable(new Date(serviceNotes[i].dateCreated)) + "</strong>";
                
                if (serviceNotes[i].internalFlag) {
                    text += " [Internal Note]";
                }
                
                text += "<blockquote>" + formattedNote + "</blockquote>";
                
                i++;
                
            } while(operation == "detail" && i < serviceNotes.length);
            
            if (operation != "detail") {
                text += "For more details try <code>/cw ticket " + ticketId + " detail</code><br>";
            }
        }
        
        text += "<small>This is the <em>mobile</em> version. For better formatting, use the Webex desktop or web client.</small>"
        
        // Create  the Adaptive Card version of the message
        let card_body = [];
        
        // add title container
        card_body.push({
            "type": "Container",
            "style": "emphasis",
            "bleed": true,
            "items": [
                {
                    "type": "TextBlock",
                    "text": "Ticket #" + ticket.id +  " - " + ticket.summary,
                    "size": "Large",
                    "weight": "Bolder"
                }
            ]
        });
        
        // add ticket details
        card_body.push({
            "type": "FactSet",
            "facts": [
                {
                    "title": "Status",
                    "value": ticket.status.name.replace('>','')
                },
                {
                    "title": "Requester",
                    "value": "[" + ticket.contactName + "](" + ticket.contactEmailAddress + ") at " +  ticket.company.name
                },
                {
                    "title": "Assigned to",
                    "value": await returnTicketAsignee(ticket)
                }
            ]
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
                                    "text": "DATE/TIME"
                                }
                            ],
                            "width": 40
                        },
                        {
                            "type": "Column",
                            "spacing": "Large",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "weight": "Bolder",
                                    "text": "UPDATED BY"
                                }
                            ],
                            "width": 60
                        }
                    ]
                }
            ],
            "bleed": true
        });
        
        // create line for each ticket comment, or first ticket comment only
        let i = 0;
        do {
            
            card_body.push({
                "type": "Container",
                "separator": (i > 0 ? true : false), // separator on all subsequent lines
                "items": [
                    {
                        "type": "ColumnSet",
                        "columns": [
                            {
                                "type": "Column",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text":  dateToHumanReadable(new Date(serviceNotes[i].dateCreated)),
                                        "wrap": true,
                                        "weight": "Bolder"
                                    }
                                ],
                                "width": 40
                            },
                            {
                                "type": "Column",
                                "spacing": "Medium",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text": returnNoteName(serviceNotes[i]),
                                        "wrap": true,
                                        "weight": "Bolder"
                                    }
                                ],
                                "width": 60
                            }
                        ]
                    },
                    {
                        "type": "RichTextBlock",
                        "inlines": [
                                        {
                                "type": "TextRun",
                                "text": serviceNotes[i].text,
                                "size": "Small"
                            }
                        ]
                    }
                ]
            });
            
            i++;
        } while (operation == "detail" && i < serviceNotes.length);
        
              
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
        
        await bot.reply(message, {markdown: text, attachments: card_attach});
        
    // controller
    });

}

function dateToHumanReadable(date) {
    let df = require ('dateformat');
    
    date.setHours(date.getHours() - 4);
    
    let humanReadable = df(date, "ddd, m/d/yy h:MM TT");
    
    return humanReadable
}

/*
 * Takes a ServiceNote and returns a contact or member name
 */
function returnNoteName(note) {
    if (note.contact) {
        return note.contact.name;
    } else if (note.member) {
        return note.member.name;
    }
    
    return "Unspecified Name"
}

/*
 * Takes a Ticket and returns an assignee and serviceboard
 */
function returnTicketAsignee(ticket) {
    let text = "";
    
    if (ticket.owner && !(ticket.owner.name == "undefined")) {
        text += ticket.owner.name + " ";
    }
    
    if (ticket.board) {
        text += "[" + ticket.board.name + "]";
    }
    
    return text;
}