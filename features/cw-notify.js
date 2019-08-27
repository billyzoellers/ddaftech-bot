/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {
    
    const tools = require('../tools/connectwise');
    const { BotkitConversation } = require('botkit');
    
    controller.hears(new RegExp(/^\/cw notify (.*?)$/),'message', async(bot, message) => {
        
        // Temporary, BZoellers only
        if (message.personEmail != "bzoellers@ddaftech.com") {
            let text = "Sorry, command isn't available to mere mortals just yet.";
            
            await bot.reply(message, {markdown: text});
            return;
        }
        
        let input = message.matches[1].replace('&amp;','&');
        console.log("/cw-notify.js: got request to add notification for " + input);
        
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
        
        let params = {
            "conditions": "name='" + input + "'",
        }
        
        try {
            var companies = await cw.CompanyAPI.Companies.getCompanies(params)

        }catch(e) {
            console.log("cw-notify.js: error on getCompanies with name " + input);
            console.error(e);
        
            throw(e);
        }
        
        if (companies.length != 1) {
            let text = "I wasn't able to find a company that matched that name.";
            
            await bot.reply(message, {markdown: text});
            return;
        }
        
        let company = companies[0];
        console.log(company.id);
        
        var Notification = require('mongoose').model('Notification')
        let notify = await Notification.find({ company_id: company.id })
        console.log(notify);
        
        // if a notification already exists, do not allow another one to be created
        if (notify.length) {
            let text = "That a subscription already exists for " + company.name + " in ";
            
            let room = await bot.api.rooms.get(notify[0].room_id);
            text += room.title;
            
            if (room.teamId) {

                let team = await bot.api.teams.get(room.teamId);
                
                text += " [" + team.name + "]";
            }
            
            await bot.reply(message, {markdown: text});
            return;
        }
        
        let text = "Adding notification for " + company.name;
        
        let newNotify = new Notification({ company_id: company.id, room_id: message.channel});
        newNotify.save();
        
        await bot.reply(message, {markdown: text});
        
    })

    controller.hears('/cw notify','message', async(bot, message) => {
        
        // find out if a subscription already exists for this room
        var Notification = require('mongoose').model('Notification')
        let notify = await Notification.find({ room_id: message.channel })
        
        // if a subscription already exists
        let text;
        if (notify.length > 0) {
            
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
            
            text = "Notifications already exist for this room for the following companies:<br><ul>";
            
            for (let i = 0; i < notify.length; i++) { 
                let name;
                
                if (notify[i].company_id) {
                    // if a company ID is defined
                    
                    try {
                        var c = await cw.CompanyAPI.Companies.getCompanyById(notify[i].company_id);
            
                    }catch(e) {
                        console.log("cw-notify.js: error on getCompaniesById with ID " + notify[i].company_id);
                        console.error(e);
                    
                        throw(e);
                    }
                    
                    name = c.name;
                    
                } else if (notify[i].board_id) {
                    name = "<em>Fallback Board ID " + notify[i].board_id + "</em>";
                } else {
                    name = "<em>Fallback Notifications</em>";
                }
                
              text += "<li>" + name + "</li>";
            }
            text += "</ul>";
            
        } else {
            
            text = "There are no notifications for this room."
            
        }
        text += "To add a new notification, use `/\cw notify <Company-Name>`"
        
        await bot.reply(message, {markdown: text});
        
    // controller
    });
    
    controller.hears('/cw notify','direct_message', async(bot, message) => {
    
        var Notification = require('mongoose').model('Notification');
        let notify = await Notification.find();
        
        if (!notify) {
            return;
            
        }
        
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
        
        let text = "I can help you find which rooms notifications are going to. See below:<br><ul>"

        for (let i = 0; i < notify.length; i++) {
            text += "<li><strong>";
            // notification scope
            if (notify[i].company_id) {
                let c = await cw.CompanyAPI.Companies.getCompanyById(notify[i].company_id);
                
                text += c.name
            } else if (notify[i].board_id) {
                let b = await cw.ServiceDeskAPI.Boards.getBoardById(notify[i].board_id);
                
                text += "<em>Fallback (Board)</em> " + b.name
            } else {
                text += "<em>Fallback (GLOBAL)</em>"
            }
            
            text += ":</strong> ";
            // teams team/room
            let room = await bot.api.rooms.get(notify[i].room_id);
            text += room.title;
            
            if (room.teamId) {

                let team = await bot.api.teams.get(room.teamId);
                
                text += " in " + team.name
            }
            text += "</li>";
        }
        
        text += "</ul>"
        
        text += "use <code>/cw notify</code> in a group room for more options";
        
        await bot.reply(message, {markdown: text});
    // controller 
    });


}