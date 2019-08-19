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
        
        let input = message.matches[1];
        
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
        let notify = await Notification.find({ company_id: company.id, room_id: message.channel })
        console.log(notify);
        
        if (notify.length) {
            let text = "That subscription already exists.";
            
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
                let c;
                        
                try {
                    c = await cw.CompanyAPI.Companies.getCompanyById(notify[i].company_id);
        
                }catch(e) {
                    console.log("cw-notify.js: error on getCompaniesById with ID " + notify[i].company_id);
                    console.error(e);
                
                    throw(e);
                }
                
              text += "<li>" + c.name + "</li>";
            }
            text += "</ul>";
            
        } else {
            
            text = "There are no notifications for this room."
            
        }
        text += "<br>To add a new notification, use `/\cw notify <Company-Name>`"
        
        await bot.reply(message, {markdown: text});
        
    // controller
    });
    
    controller.hears('/cw notify','direct_message', async(bot, message) => {
    
        let text = "Sorry, `/cw notify` is currently only available in group rooms.";
        
        await bot.reply(message, {markdown: text});
    // controller 
    });


}