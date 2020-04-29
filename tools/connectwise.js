/* tools/cw-global.js
 *
 * Global methods for CW (and old methods that have not been split out)
 */
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
        const utility = require('../tools/utility');
        //console.log(ticket);
        let action = options.action;

        let card_body = []; // main body of card
        let card_actions = []; // actions for the ActionSet
        
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
                ]
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
                                                "text":  utility.serviceNotes[i].dateCreated(ticketNotes[i].dateCreated),
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
                                "type": "TextBlock",
                                "text": ticketNotes[i].text
                            }
                        ]
                    });
                }
            }
            
            // add notes to a collpsing card
            card_actions.push({
                type: "Action.ShowCard",
                title: "Show notes",
                card: {
                    type: "AdaptiveCard",
                    body: history_body,
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json"
                }
            });
            
        }
        console.log("TICKET NOTES" + ticketNotes.length);
        console.log(ticketNotes);
        
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
                        "title": "Status " + statuses[i].name.replace('>',''),
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
        card_actions.push({
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
            }
        });
        
        // format body for attachment in Webex teams
        let card_attach = {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
                $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                type: "AdaptiveCard",
                version: "1.1",
                body: card_body,
                actions: card_actions
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
        
        // Use adaptive cards templating
        var ACData = require("adaptivecards-templating");
        
        // template for ServiceTicket
        var templatePayload = {
            "type": "AdaptiveCard",
            "version": "1.1",
            "body": [
                {
                    type: "Container",
                    style: "{if(actionText, 'warning', 'emphasis')}",
                    bleed: true,
                    items: [
                        {
                            type: "ColumnSet",
                            columns: [
                                {
                                    type: "Column",
                                    items: [
                                        {
                                            type: "TextBlock",
                                            size: "Medium",
                                            weight: "Bolder",
                                            text: "[{friendlyTicketType(ticket.recordType)} #{ticket.id}](https://connectwise.deandorton.com/v4_6_release/services/system_io/Service/fv_sr100_request.rails?service_recid={ticket.id}&companyName=ddaf)"
                                        }
                                    ],
                                    width: "6"
                                },
                                {
                                    type: "Column",
                                    items: [
                                        {
                                            "type": "TextBlock",
                                            "text": "{toUpperCase(actionText)}",
                                            "size": "Medium",
                                            "weight": "Bolder",
                                            "color": "attention",
                                            "horizontalAlignment": "Right"
                                        }
                                    ],
                                    width: "2",
                                    $when: "{actionText != ''}"
                                }
                            ]
                        }
                    ]
                },
                {
                    type: "TextBlock",
                    size: "Large",
                    text: "{ticket.summary}",
                    wrap: true
                },
                {
                    "type": "FactSet",
                    "facts": [
                        {
                            "title": "Status",
                            "value": "{friendlyStatusName(ticket.status)}"
                        },
                        {
                            "title": "Requester",
                            "value": "[{ticket.contactName}]({ticket.contactEmailAddress}) at {ticket.company.name}"
                        },
                        {
                            "title": "Assigned to",
                            "value": "{friendlyAssigneeName(ticket.owner,ticket.board)}"
                        }
                    ]
                }
                
            ],
            "actions": [
                {
                    "type": "Action.ShowCard",
                    "title": "Show notes",
                    "card": {
                        "type": "AdaptiveCard",
                        "body": [
                            {
                                "type": "Container",
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
                                ]
                            },
                            {
                                "type": "Container",
                                "$data": "{ticketNotes}",
                                "separator": true,
                                "items": [
                                    {
                                        "type": "ColumnSet",
                                        "columns": [
                                            {
                                                "type": "Column",
                                                "items": [
                                                    {
                                                        "type": "TextBlock",
                                                        "text":  "{friendlyDate(dateCreated)}",
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
                                                        "text": "{friendlyNoteName($data)}",
                                                        "wrap": true,
                                                        "weight": "Bolder"
                                                    }
                                                ],
                                                "width": 60
                                            }
                                        ]
                                    },
                                    {
                                        "type": "TextBlock",
                                        "text": "{text}"
                                    }
                                ]
                            }
                        ],
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
                    },
                    "$when": "{ticketNotes.length > 0}"
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
                                                "value": "{toString($root.ticket.status.id)}",
                                                "choices": [
                                                    {
                                                        "$data": "{statusOptions}",
                                                        "title": "{friendlyStatusName($data,$root.ticket.status.id)}",
                                                        "value": "{toString(id)}"
                                                    }
                                                ]
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
                                    "ticketId": "{ticket.id}",
                                    "cw_current_status_id": "{status.id}"
                                }
                            }
                        ],
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
                    }
                },
                {
                    "type": "Action.Submit",
                    "title": "Assign to Me",
                    "data": {
                        "id": "cw_ticket_assign_self",
                        "ticketId": "{ticket.id}"
                    }
                }
            ]
        };
        
        var template = new ACData.Template(templatePayload);
        
        var actionText;
        if (action) {
            
            switch(action) {
              case 'updated':
                actionText = "Updated";
                break;
              case 'added':
                actionText = "New";
                break;
            }
        }

        // "ServiceTicket" to "Service Ticket"
        let ticketTypeText = ticket.recordType.replace(/([A-Z])/g, ' $1').trim()
        
        // Create the text version of the message (for incompatible clients and client notifications)
        let text = "";
        if (action) {
            text += actionText + " ";
        }
        text += ticketTypeText + " #" + ticket.id + ": " + ticket.summary + " (" + ticket.contactName + " at " +  ticket.company.name + ")";
        console.log("/connectwise.js getMessageForTicket():" + text)
        
        let card_attach;
        if (ticket.recordType == "ProjectTicket") {
            
            card_attach = await module.exports.getAdaptiveCardForProjectTicket(cw,ticket,serviceNotes,options);
        } else {
            // generate card for non-ProjectTicket
            let context = new ACData.EvaluationContext();
            context.$root = {
                "actionText": actionText,
                "ticket": ticket,
                "ticketNotes": serviceNotes,
                "statusOptions": statuses
            };
            
            context.registerFunction(
                "friendlyDate",
                (input) => {
                    return utility.date_string_format_long_with_time(input);
                }
            );
            
            context.registerFunction(
                "friendlyTicketType",
                (input) => {
                    return input.replace(/([A-Z])/g, ' $1').trim();
                }
            );
            
            context.registerFunction(
                "friendlyNoteName",
                (input) => {
                    let text = "";

                    if (input.contact) {
                        text += input.contact.name;
                    } else if (input.member) {
                        text += input.member.name;
                    } else {
                        text += "Unspecified Name";
                    }
                    
                    if (input.internalAnalysisFlag) {
                        text += " [Internal Note]";
                    }
                    
                    return text;
                }
            );
            
            context.registerFunction(
                "friendlyAssigneeName",
                (owner,board) => {
                    let text = "";
        
                    if (owner && !(owner.name == "undefined")) {
                        text += owner.name + " ";
                    }
                    
                    if (board) {
                        text += "[" + board.name + "]";
                    }
                    
                    return text;
                }
            );
            
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
    
            card_attach = {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": template.expand(context)
            }
        }

        // total length of data being posted to webex
        let length = text.length + JSON.stringify(card_attach).length;
        console.log("/connectwise.js: post length in chars " + length)
        return { text, card_attach, ticket };
    // end of getMessageForTicket    
     }
     
     
};