/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {
    
    const tools = require('../tools/connectwise');

    controller.on('ticket_webhook', async(bot, data) => {
        
        let ticketId = data.ticketId;
        let action = data.action;
        
        let operation;
        if (action == "updated") {
            operation = "detail";
        }
        
        console.log('/cw-ticket.js: ticket_webhook for ticket ' + ticketId);
        
        // get a message from Connectwise
        try {
            var response = await tools.getMessageForTicket(ticketId, {operation, action});
        } catch (e) { return };
        
        let company_id = response.ticket.company.id;
        let board_id = response.ticket.board.id;
        let status_id = response.ticket.status.id;
        
        console.log("CompanyId: " + company_id + " " + response.ticket.company.name);
        console.log("BoardId: " + board_id + " " + response.ticket.board.name);
        console.log("StatusId: " + status_id + " " + response.ticket.status.name);

        /* DB search
         * 
         */
        var Notification = require('mongoose').model('Notification')
        let roomId = null;
        let searchParam = [];
        
        searchParam[0] = { company_id: company_id };
        searchParam[1] = { company_id: null, board_id: board_id };
        searchParam[2] = { company_id: null, board_id: null };
        
        for (let i = 0; i < searchParam.length && !roomId; i++) { 
            let search = await Notification.find(searchParam[i]);
            
            if (search.length == 1) {
                console.log("/cw-ticket.js: matched Notification for " + searchParam[i]);
                roomId = search[0].room_id;
            }
        }
        
        if (!roomId) {
            console.log("/cw-ticket.js: no match for Notification, not sending message");
            return;
        }

        await bot.startConversationInRoom(roomId);
    
        // send the message
        try {
            await bot.say({markdown: response.text, attachments: response.card_attach})
        } catch(e) {
            console.error(e);
        }
        
        
    });

    controller.hears(new RegExp(/^\/cw(?:\s|ticket)*(\d+)(?:$|\s)($|\S+)/),'message,direct_message', async(bot, message) => {
        
        let ticketId = message.matches[1];
        let operation = message.matches[2];
        
        if (operation == "details" || operation == "d") {
            operation = "detail";
        }
        
        console.log('/cw-ticket.js: requested ticket ' + ticketId + ' operation ' + operation);
        
        try {
            var response = await tools.getMessageForTicket(ticketId, {operation});
        
        } catch (e) {
                        
            let text = "Sorry, I wasn't able to help with that. " + e.message + ".";
            await bot.say({markdown: text});
            
            return;
        }
        
        // send the message
        try {
            await bot.reply(message, {markdown: response.text, attachments: response.card_attach});
        } catch(e) {
            console.error(e);
        }

    // controller
    });

}