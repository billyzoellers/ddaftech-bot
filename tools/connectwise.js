// tools.js
// ========
module.exports = {
    /* 
     * formatStatus(status) -> takes 'status' as a string, and returns a better formated string
     *
     *      Input: (String)
     *      Output: (String) with excess formatting removed
     */
    formatStatus: function (status) {
        let str = status.replace('>','')
        
        if (status == "Customer Updated") {
            return "Updated";
        }
        
        return str;
    },
    
    /*
     * dateToHumanReadable(date) -> accepts a date in ConnectWise format, returns the date with better formatting
     *
     *      Input: (Date)
     *      Output: (String)
     */
    dateToHumanReadable: function (date) {
        let df = require ('dateformat');
        
        date.setHours(date.getHours() - 4);
        
        let humanReadable = df(date, "ddd, m/d/yy h:MM TT");
        
        return humanReadable
    },
    
    /*
     * returnNoteName(ServiceNote) -> accepts a ConnectWise ServiceNote object and returns the associated member OR contact name
     *
     *      Input: (ServiceNote)
     *      Output: (String)
     */
    returnNoteName: function (note) {
        if (note.contact) {
            return note.contact.name;
        } else if (note.member) {
            return note.member.name;
        }
        
        return "Unspecified Name"
    },
    
    /*
     * returnTicketAssignee(ServiceTicket) -> accepts a ConncectWise ServiceTicket object and returns a formatted string
     *
     *      Input: (ServiceTicket)
     *      Output: (String) "Ticket Owner Name [Ticket Board Name]"
     */
    returnTicketAssignee: function (ticket) {
        let text = "";
        
        if (ticket.owner && !(ticket.owner.name == "undefined")) {
            text += ticket.owner.name + " ";
        }
        
        if (ticket.board) {
            text += "[" + ticket.board.name + "]";
        }
        
        return text;
    },
    
    /*
     * getMessageForTicket(ticketId,options) -> takes a CW ticket ID, and returns a formatted message to be sent back.
     *
     *      Input: (String)
     *      Output: {(String)markdown, (String)card_attachment}
     */
     getMessageForTicket: async function (ticketId,options) {

        let operation = options.operation;
        let action = options.action;
         
        // create API connection
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
            console.log("cw-ticket.js: error on getTicketById with ticketId " + ticketId);
            console.error(e);

            throw(e);
        }
        
        let params;
        
        if (operation == "detail") {
          params = {
              "orderby": "dateCreated desc"
            }
        }
        
        try {
            var serviceNotes = await cw.ServiceDeskAPI.ServiceNotes.getServiceNotes(ticketId,params);

        }catch(e) {
            console.log("cw-ticket.js: error on getServiceNotes with ticketId " + ticketId);
            console.error(e);
        
            throw(e);
        }
        
        var actionText;
        if (action) {
            
            switch(action) {
              case 'updated':
                actionText = "TICKET UPDATED";
                break;
              case 'added':
                actionText = "NEW TICKET";
                break;
              default:
                actionText = action;
            }
        }
        
        
        // Create the text version of the message
        let text = "";
        
        if (action) {
            text += "<h3>" + actionText + "</h3>"
        }
        
        text += "<h3>Ticket " + ticket.id +  " - " + ticket.summary + "</h3>";
        
        text += "<blockquote><strong>Status:</strong> " + ticket.status.name.replace('>','');
        
        text += "<br><strong>Requester:</strong> <a href='mailto:" + ticket.contactEmailAddress + "'>" + ticket.contactName + "</a> at " + ticket.company.name;
        
        text += "<br><strong>Assignee:</strong> " + await module.exports.returnTicketAssignee(ticket);
        
        text += "</blockquote>";

        /* no notes on mobile version
        if (serviceNotes) {
            text += "<hr>";
            
            let i = 0;
            do {
                let formattedNote = serviceNotes[i].text.replace(/\n/g, '<br>');
                
                text += "<strong>" + module.exports.returnNoteName(serviceNotes[i]) + " on " + module.exports.dateToHumanReadable(new Date(serviceNotes[i].dateCreated)) + "</strong>";
                
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
        */
        
        text += "<small>This is the <em>mobile</em> version. Ticket details are available on the desktop version.</small>"
        
        // Create  the Adaptive Card version of the message
        let card_body = [];
        let history_body = [];
        
        if (action) {
            
            card_body.push({
                "type": "Container",
                "items": [
                    {
                        "type": "TextBlock",
                        "text": actionText,
                        "size": "Large",
                        "weight": "Bolder",
                        "color": "attention"
                    }
                ]
            });
        }
        
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
                    "value": module.exports.returnTicketAssignee(ticket)
                }
            ]
        });
        
        // add comments heading       
        history_body.push({
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
            
            history_body.push({
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
                                        "text":  module.exports.dateToHumanReadable(new Date(serviceNotes[i].dateCreated)),
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
                                        "text": module.exports.returnNoteName(serviceNotes[i]),
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
        
        card_body.push({
            "type": "ActionSet",
            "actions": [
                {
                    "type": "Action.ShowCard",
                    "title": "Show " + (operation == 'detail' ? "full history" : "initial description"),
                    "card": {
                        "type": "AdaptiveCard",
                        "body": history_body,
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
                    }
                },
                {
                    "type": "Action.ShowCard",
                    "title": "Add comment",
                    "card": {
                        "type": "AdaptiveCard",
                        "body": [
                            {
                                "type": "Input.Text",
                                "id": "cw_add_comment",
                                "placeholder": "Add your comment..",
                                "isMultiline": true
                            },
                            {
                                "type": "Input.ChoiceSet",
                                "id": "cw_comment_visibility",
                                "choices": [
                                    {
                                        "title": "Public (send to client)",
                                        "value": "public"
                                    },
                                    {
                                        "title": "Private",
                                        "value": "private"
                                    }
                                ]
                            }
                        ],
                        "actions": [
                            {
                                "type": "Action.Submit",
                                "title": "Send",
                                "data": {
                                    "id": "submit_cw_add_comment",
                                    "ticketId": ticket.id
                                }
                            }
                        ],
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
                    },
                    "style": "positive"
                }
            ]
        });
              
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
        
        return { text, card_attach, ticket };
    // end of getMessageForTicket    
     },
     
     /*
     * formatTicketToMessage(ticketId,options) -> takes a CW ticket ID, and returns a formatted message to be sent back.
     *
     *      Input: (String)
     *      Output: {(String)markdown, (String)card_attachment}
     */
     formatTicketToMessage: async function (ticket) {
         
     }
};