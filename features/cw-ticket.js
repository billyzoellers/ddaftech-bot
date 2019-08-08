/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {

    controller.hears(new RegExp(/^\/cw ticket (\S+)(?:$|\s)($|\S+)/),'message,direct_message', async(bot, message) => {
        
        let ticketId = message.matches[1];
        let operation = message.matches[2];
        
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
        
        try {
            var ticket = await cw.ServiceDeskAPI.Tickets.getTicketById(ticketId);
        }catch(e) {
            console.error(e)
        }

        let serviceNotes = await cw.ServiceDeskAPI.ServiceNotes.getServiceNotes(ticketId);
        
        let text = "<blockquote><h3>Ticket " + ticket.id +  " - " + ticket.summary + "</h3>";
        
        text += "<strong>Status:</strong> " + ticket.status.name;
        
        text += "<br><strong>Requester:</strong> <a href='mailto:" + ticket.contactEmailAddress + "'>" + ticket.contactName + "</a> at " + ticket.company.name;
        
        if (ticket.owner) {
            text += "<br><strong>Assignee:</strong> " + ticket.owner.name + " (" + ticket.board.name + ")";
        }

        if (serviceNotes) {
            text += "<hr>"
            
            let note = serviceNotes[0];
            
            let formattedNote = note.text.replace(/\n/g, '<br>')

            if (note.contact) {
                text += "<strong>" + note.contact.name + " on " + dateToHumanReadable(new Date(note.dateCreated)) + "</strong>";
            }
            if (note.member) {
                text += "<strong>" + note.member.name + " on " + dateToHumanReadable(new Date(note.dateCreated)) + "</strong>";
            }
            if (note.internalFlag) {
                // internal note
            }
            
            text += "<blockquote>" + formattedNote + "</blockquote>";
        }
        
        text += "</blockquote>";
        
        text += "For more details try <code>/cw ticket " + ticketId + " details</code>";
        
        // Create an adaptive card
        let note = serviceNotes[0];
        
        var text_runs = [];
        var noteText = note.text.split('\n');
        for(let n of noteText) {
            text_runs.push(
                {
                    "type": "TextRun",
                    "text": n + "\n",
                    "size": "Small"
                }
            );
        }
        
        var rich_text_block = {
            "type": "RichTextBlock",
            "inlines": text_runs
        }
        
        let card_ticket_columnset = {
            "type": "Container",
            "items": [
                {
                    "type": "ColumnSet",
                    "columns": [
                        {
                            "type": "Column",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text":  dateToHumanReadable(new Date(note.dateCreated)),
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
                                    "text": returnNoteName(note),
                                    "wrap": true,
                                    "weight": "Bolder"
                                }
                            ],
                            "width": 60
                        }
                    ]
                },
                rich_text_block
            ]
        }
    
        // iterate through all service notes if operation == detail, otherwise only first
        let i = 0;
        do {
            
            // need to write building of notes columnsets in here
            
            i++;
        } while (operation == "detail" && i < serviceNotes.length);
        
        
        
        let card = {
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.0",
                "body": [
                    {
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
                    },
                    {
                        "type": "FactSet",
                        "facts": [
                            {
                                "title": "Status",
                                "value": ticket.status.name
                            },
                            {
                                "title": "Requester",
                                "value": "[" + ticket.contactName + "](" + ticket.contactEmailAddress + ") at " +  ticket.company.name
                            },
                            {
                                "title": "Assigned to",
                                "value": returnTicketAsignee(ticket)
                            }
                        ]
                    },
                    {
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
                    },
                    card_ticket_columnset
                ]
            }
        }
        
        
        await bot.reply(message, {markdown: text, attachments: card});
        
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