/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {
    
    const tools = require('../tools/connectwise');

    controller.on('ticket_webhook', async(bot,ticketId) => {
        
        console.log('/cw-ticket.js: ticket_webhook for ticket ' + ticketId);

        // logic to look up the correct place for this ticketId
        let personId = "Y2lzY29zcGFyazovL3VzL1BFT1BMRS9iODFjNjhmYy0zMGY0LTQ1NTctYmJiMC1lMzhjMzVmOTU4Yjg";
        let roomId = "Y2lzY29zcGFyazovL3VzL1JPT00vMjE4NDliYWYtZDg0OS0zOTY2LWI1NzEtNmEzYjA3MTA4ZDFj";
        
        await bot.startConversationInRoom(roomId);
        
        // get a message from Connectwise
        try {
            var response = await tools.getMessageForTicket(ticketId);
            
            // send the message
            try {
                await bot.say({markdown: response.text, attachments: response.card_attach})
            } catch(e) {
                console.error(e);
            }
        
        } catch (e) {
                        
            let text = "Error posting notification: " + e.message + ".";
            await bot.say({markdown: text});
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
            var response = await tools.getMessageForTicket(ticketId, operation);
            
            // send the message
            try {
                await bot.reply(message, {markdown: response.text, attachments: response.card_attach});
            } catch(e) {
                console.error(e);
            }
        
        } catch (e) {
                        
            let text = "Error posting notification: " + e.message + ".";
            await bot.say({markdown: text});
        }

    // controller
    });

}