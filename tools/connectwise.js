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
     *  getAdaptiveCardForProjectTicket(ticket)
     *
     *
     *
     *
     *
     */
     getAdaptiveCardForProjectTicket: async function (cw,ticket,ticketNotes,options) {
        console.log(ticket);
        let action = options.action;

        let card_body = []; // main body of card
        let actionset_actions = []; // actions for the ActionSet
        
        if (action) {
            card_body.push({
                type: "Container",
                items: [
                    {
                        type: "TextBlock",
                        text: "Action",
                        size: "Large",
                        weight: "Bolder",
                        color: "attention"
                    }
                ]
            });
        }
        
        // Project Information  
        card_body.push({
            type: "Container",
            style: "emphasis",
            bleed: true,
            items: [
                {
                    type: "TextBlock",
                    text: ticket.project.name,
                    size: "Large",
                    weight: "Bolder"
                }
            ]
        },
        {
            type: "FactSet",
            facts: [
                {
                    title: "Project ID",
                    value: "#" + ticket.project.id.toString()
                },
                {
                    title: "Company",
                    value: ticket.company.name
                }
            ]
        });
        
        // Specific Ticket Information
        card_body.push({
            type: "Container",
            style: "emphasis",
            bleed: false,
            items: [
                {
                    type: "TextBlock",
                    text: ticket.summary,
                    size: "Medium",
                    weight: "Bolder"
                },
                {
                    type: "FactSet",
                    facts: [
                        {
                            title: "Ticket ID",
                            value: "#" + ticket.id.toString()
                        },
                        {
                            title: "Status",
                            value: ticket.status.name.replace('>','')
                        },
                        {
                            title: "Contact",
                            value: "[" + ticket.contactName + "](" + ticket.contactEmailAddress + ")"
                        },
                        {
                            title: "Assigned to",
                            value: module.exports.returnTicketAssignee(ticket)
                        }
                    ]
                }
            ]
        });
        
        // if there are attached notes
        if (ticketNotes.length) {
            let history_body = [];
            
            // push header row
            history_body.push({
                type: "Container",
                spacing: "Large",
                style: "emphasis",
                items: [
                    {
                        type: "ColumnSet",
                        columns: [
                            {
                                type: "Column",
                                items: [
                                    {
                                        type: "TextBlock",
                                        weight: "Bolder",
                                        text: "DATE/TIME"
                                    }
                                ],
                                width: 40
                            },
                            {
                                type: "Column",
                                spacing: "Large",
                                items: [
                                    {
                                        "type": "TextBlock",
                                        "weight": "Bolder",
                                        "text": "UPDATED BY"
                                    }
                                ],
                                width: 60
                            }
                        ]
                    }
                ],
                bleed: true
            });
            
            // generate a note container for each note
            for(let i=0; i<ticketNotes.length; i++) {
                if (ticketNotes[i].text) {
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
                                                "text":  module.exports.dateToHumanReadable(new Date(ticketNotes[i].dateCreated)),
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
                                                "text": module.exports.returnNoteName(ticketNotes[i]) + (ticketNotes[i].internalAnalysisFlag ? " [Internal Note]" : ""),
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
                                        "text": ticketNotes[i].text,
                                        "size": "Small"
                                    }
                                ]
                            }
                        ]
                    });
                }
            }
            
            // add notes to a collpsing card
            actionset_actions.push({
                type: "Action.ShowCard",
                title: "Show notes",
                card: {
                    type: "AdaptiveCard",
                    body: history_body,
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json"
                }
            });
            
        }
        
        // create action for updating card
        let status_choices = []
        
        // API request for available statuses
        try {
            let params = {
              "orderby": "sortOrder asc",
              "conditions": "inactive=false"
            }
            
            let statuses = await cw.ServiceDeskAPI.Statuses.getStatusesByBoardId(ticket.board.id, params);
        
            for (let i = 0; i < statuses.length; i++) {
                if (statuses[i].id == ticket.status.id) {
                    // current status
                    status_choices.push({
                        "title": statuses[i].name.replace('>','') + " (current status)",
                        "value": statuses[i].id.toString()
                    })
                    
                } else {
                    status_choices.push({
                        "title": statuses[i].name.replace('>',''),
                        "value": statuses[i].id.toString()
                    })
                }
            }
            
        }catch(e) {
            console.log("getAdaptiveCardForProjectTicket(): error on getStatusesByBoardId with boardId " + ticket.board.id);
            console.error(e);

            throw(e);
        }
        
        // action for updating ticket
        actionset_actions.push({
            "type": "Action.ShowCard",
            "title": "Update ticket",
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
                        "type": "ColumnSet",
                        "columns": [
                            {
                                "type": "Column",
                                "width": "stretch",
                                "items": [
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
                                ]
                            },
                            {
                                "type": "Column",
                                "width": "stretch",
                                "items": [
                                    {
                                        "type": "Input.ChoiceSet",
                                        "id": "cw_new_status_id",
                                        "value": ticket.status.id.toString(),
                                        "placeholder": "(Change Status)",
                                        "choices": status_choices
                                    }
                                ]
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
                            "ticketId": ticket.id,
                            "cw_current_status_id": ticket.status.id
                        }
                    }
                ],
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
            },
            "style": "positive"
        });
        
        // add actions to the end of the card body
        card_body.push({
            "type": "ActionSet",
            "actions": actionset_actions
        });
        
        // format body for attachment in Webex teams
        let card_attach = {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
                $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                type: "AdaptiveCard",
                version: "1.0",
                body: card_body
            }
        }
        
        return card_attach;
     },
    
    /*
     * getMessageForTicket(ticketId,options) -> takes a CW ticket ID, and returns a formatted message to be sent back.
     *
     *      Input: (String)
     *      Output: {(String)markdown, (String)card_attachment}
     */
     getMessageForTicket: async function (ticketId,options) {
         
        const utility = require('../tools/utility');

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
        
        let params = {
              "orderby": "dateCreated desc"
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
        let card_attach;
        
        if (ticket.recordType == "ProjectTicket") {
            text += "<small>Project Tickets are Desktop only</small>";
            
            card_attach = await module.exports.getAdaptiveCardForProjectTicket(cw,ticket,serviceNotes,options);
        } else {
        
            if (action) {
                text += "<h3>" + actionText + "</h3>"
            }
            
            text += "<h3>Ticket " + ticket.id +  " - " + ticket.summary + "</h3>";
            
            text += "<blockquote><strong>Status:</strong> " + ticket.status.name.replace('>','');
            
            text += "<br><strong>Requester:</strong> <a href='mailto:" + ticket.contactEmailAddress + "'>" + ticket.contactName + "</a> at " + ticket.company.name;
    
            text += "<br><strong>Assignee:</strong> " + await module.exports.returnTicketAssignee(ticket);
    
            text += "</blockquote>";
    
            
            // initial description only on mobile version
            if (serviceNotes.length) {
    
                let initialNoteIndex = serviceNotes.length-1;
    
                text += "<hr><strong>" + module.exports.returnNoteName(serviceNotes[initialNoteIndex]) + " on " + module.exports.dateToHumanReadable(new Date(serviceNotes[initialNoteIndex].dateCreated)) + "</strong>";
                
                if (serviceNotes[initialNoteIndex].internalFlag) {
                    text += " [Internal Note]";
                }
                
                text += "<blockquote>" + utility.truncate_string(serviceNotes[initialNoteIndex].text.replace(/\n/g, '<br>'),200,'.....') + "</blockquote>";
            }
            
            text += "<small>This is the <em>mobile</em> version.</small>"
            
    
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
            
            for (let i = 0; i < serviceNotes.length; i++) {
                // create a note block if note has text
                if (serviceNotes[i].text) {
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
                                                "text": module.exports.returnNoteName(serviceNotes[i]) + (serviceNotes[i].internalAnalysisFlag ? " [Internal Note]" : ""),
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
                }
            }
            
            let status_choices = [];
            // Make API request for status options
            try {
                let params = {
                  "orderby": "sortOrder asc",
                  "conditions": "inactive=false"
                }
                
                var statuses = await cw.ServiceDeskAPI.Statuses.getStatusesByBoardId(ticket.board.id, params);
            }catch(e) {
                console.log("cw-ticket.js: error on getStatusesByBoardId with boardId " + ticket.board.id);
                console.error(e);
    
                throw(e);
            }
    
            for (let i = 0; i < statuses.length; i++) {
                
                if (statuses[i].id == ticket.status.id) {
                    // current status
                    status_choices.push({
                        "title": statuses[i].name.replace('>','') + " (current status)",
                        "value": statuses[i].id.toString()
                    })
                    
                } else {
                    status_choices.push({
                        "title": statuses[i].name.replace('>',''),
                        "value": statuses[i].id.toString()
                    })
                }
            }
            
            let actionset_actions = [];
            
            if (serviceNotes.length) {
                actionset_actions.push({
                    "type": "Action.ShowCard",
                    "title": "Show notes",
                    "card": {
                        "type": "AdaptiveCard",
                        "body": history_body,
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
                    }
                });
            }
            
            actionset_actions.push({
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
                            "type": "ColumnSet",
                            "columns": [
                                {
                                    "type": "Column",
                                    "width": "stretch",
                                    "items": [
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
                                    ]
                                },
                                {
                                    "type": "Column",
                                    "width": "stretch",
                                    "items": [
                                        {
                                            "type": "Input.ChoiceSet",
                                            "id": "cw_new_status_id",
                                            "value": ticket.status.id.toString(),
                                            "placeholder": "(Change Status)",
                                            "choices": status_choices
                                        }
                                    ]
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
                                "ticketId": ticket.id,
                                "cw_current_status_id": ticket.status.id
                            }
                        }
                    ],
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
                },
                "style": "positive"
            });
            
            card_body.push({
                "type": "ActionSet",
                "actions": actionset_actions
            });
                  
            // add headers to card before attaching
            card_attach = {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.0",
                    "body": card_body
                }
            }
        }
        
        // total length of data being posted to webex
        let length = text.length + JSON.stringify(card_attach).length;
        console.log("/connectwise.js: post length in chars " + length)
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