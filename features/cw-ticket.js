/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {

    controller.hears(new RegExp(/^\/cw ticket ([0-9]*?)$/),'message,direct_message', async(bot, message) => {
        
        let ticketId = message.matches[1];
        
        // Connect to CW API
        const ConnectWiseRest = require('connectwise-rest');
        const cw = new ConnectWiseRest({
            companyId: process.env.CW_COMPANY,
            companyUrl: 'connectwise.deandorton.com',
            publicKey: process.env.CW_PUBLIC_KEY,
            privateKey: process.env.CW_PRIVATE_KEY,
            debug: false,               // optional, enable debug logging
            logger: (level, text, meta) => { } // optional, pass in logging function
        });
        
        let ticket = await cw.ServiceDeskAPI.Tickets.getTicketById(ticketId);
        let serviceNotes = await cw.ServiceDeskAPI.ServiceNotes.getServiceNotes(ticketId);
        
        let text = "<blockquote><h3>Ticket " + ticket.id +  " - " + ticket.summary + "</h3>";
        
        text += "<strong>Status:</strong> " + ticket.status.name;
        
        text += "<br><strong>Requester:</strong> <a href='mailto:" + ticket.contactEmailAddress + "'>" + ticket.contactName + "</a> at " + ticket.company.name;
        
        text += "<br><strong>Assignee:</strong> " + ticket.owner.name + " (" + ticket.board.name + ")";
        

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
        
        await bot.reply(message, {markdown: text});
        
    // controller
    });
    
    controller.hears(new RegExp(/^\/cw ticket ([0-9]*?) (.*?)$/),'message,direct_message', async(bot, message) => {
        
        let ticketId = message.matches[1];
        let operation = message.matches[2];
        
        // Connect to CW API
        const ConnectWiseRest = require('connectwise-rest');
        const cw = new ConnectWiseRest({
            companyId: process.env.CW_COMPANY,
            companyUrl: 'connectwise.deandorton.com',
            publicKey: process.env.CW_PUBLIC_KEY,
            privateKey: process.env.CW_PRIVATE_KEY,
            debug: false,               // optional, enable debug logging
            logger: (level, text, meta) => { } // optional, pass in logging function
        });
        
        let ticket = await cw.ServiceDeskAPI.Tickets.getTicketById(ticketId);
        let serviceNotes = await cw.ServiceDeskAPI.ServiceNotes.getServiceNotes(ticketId);
        
        let text = "<blockquote><h3>Ticket " + ticket.id +  " - " + ticket.summary + "</h3>";
        
        text += "<strong>Status:</strong> " + ticket.status.name;
        
        text += "<br><strong>Requester:</strong> <a href='mailto:" + ticket.contactEmailAddress + "'>" + ticket.contactName + "</a> at " + ticket.company.name;
        
        text += "<br><strong>Assignee:</strong> " + ticket.owner.name + " (" + ticket.board.name + ")";
        

        if (serviceNotes) {
            text += "<hr>"
        }
        
        // add text for each service note
        for(let note of serviceNotes) {
            let formattedNote = note.text.replace(/\n/g, '<br>')
            
            text += "<strong>"
            
            if (note.contact) {
                text += note.contact.name;
            }
            if (note.member) {
                text += note.member.name;
            }
            
            text += " on " + dateToHumanReadable(new Date(note.dateCreated)) + "</strong>";
            
            if (note.internalFlag) {
                text += " Internal Note"
            }
            
            text += "<blockquote>" + formattedNote + "</blockquote>";
  
        }
        
        text += "</blockquote>";
        
        await bot.reply(message, {markdown: text});
        
    // controller
    });

}

function dateToHumanReadable(date) {
    let df = require ('dateformat');
    
    date.setHours(date.getHours() - 4);
    
    let humanReadable = df(date, "ddd, mmmm dS, yyyy h:MM TT");
    
    return humanReadable
}