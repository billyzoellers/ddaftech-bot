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
        
        // TEMP: send tickets on the active bot to one room, and dev bot to another room
        let roomId;
        if (process.env.SECRET) {
            roomId = "Y2lzY29zcGFyazovL3VzL1JPT00vYzA0NzU4YjAtYzIwZi0xMWU5LTkzY2EtZDU3ZGM5ZTc5NjY5";
        } else {
            roomId = "Y2lzY29zcGFyazovL3VzL1JPT00vMjE4NDliYWYtZDg0OS0zOTY2LWI1NzEtNmEzYjA3MTA4ZDFj";
        }
        
        let company_id = response.ticket.company.id;
        let board_id = response.ticket.board.id;
        let status_id = response.ticket.status.id;
        
        console.log("CompanyId: " + company_id + " " + response.ticket.company.name);
        console.log("BoardId: " + board_id + " " + response.ticket.board.name);
        console.log("StatusId: " + status_id + " " + response.ticket.status.name);
        
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