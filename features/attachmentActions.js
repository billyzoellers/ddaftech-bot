/**
 * attachmentActions.js
 * handles all attachmentActions - when an adaptive card has inputs
 */

module.exports = function(controller) {
    
    controller.on('attachmentActions', async(bot, message) => {
        console.log("attachmentActions.js: recieved an attachment action");

        switch(message.inputs.id) {
            case 'cw_ticket_assign_self':
                console.log("attachmentActions.js: for cw assign to self");
                
                await processCWTicketAssignSelf(message.inputs.ticketId, message.personId, bot, message);
                
                break;
            case 'submit_mv_list_info':
                console.log("attachmentActions.js: for mv list info");
                await processMVInfo(message.inputs.mv_list_serial, bot, message);
                
                break;
            case 'submit_mv_list_snapshot':
                console.log("attachmentActions.js: for mv list snapshot");
                await processMVSnapshot(message.inputs.mv_list_serial, bot, message);
                
                break;
            case 'add_cw_notification':
                console.log("attachmentActions.js: for add cw notification");
                await processAddCWNotifications(message.inputs.company_name, bot, message);
                
                break;
            case 'delete_cw_notification':
                console.log("attachmentActions.js: for delete cw notification");
                await processDeleteCWNotifications(message.inputs.cw_notifications_edit, bot, message);
                
                break;
            case 'confirm_cw_notification':
                console.log("attachmentActions.js: for confirm cw notification");
                await processConfirmCWNotifications(message.inputs.cw_confirm_company_id, bot, message);

                break;
            default:
                // legacy CW stuff - need to sort better
                const utility = require('../tools/utility');
        
                console.log(message.inputs);
                
                // cw submit comment
                if (message.inputs.id == "submit_cw_add_comment") {
        
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
                    
                    // Match webex member to connectwise
                    var webexPerson = await bot.api.people.get(message.personId);
                    let member_ident = webexPerson.emails[0].split('@')[0];
                    try {
                        var cwPerson = await cw.SystemAPI.Members.getMemberByIdentifier(member_ident);
                        
                    }catch(e) {
                        console.log("attachmentAction.js: error finding ConnectWise member from identifier " + member_ident);
                        console.error(e);
                        
                        let text = "Sorry, I'm having trouble with that. It seems like you may not have permissions to post to ConnectWise. " + "<em> ";
                        text += e.message + " (" + e.code + ")</em>";
                        await bot.reply(message, {markdown: text});
                        
                        return;
                    }
        
                    // ticket status change
                    var updatedTicket;
                    if (message.inputs.cw_current_status_id != message.inputs.cw_new_status_id) {
                        // make API request to update ticket
                        try {
        
                            let ops = [{
                                op: "replace",
                                path: "status",
                                value: {
                                    id: message.inputs.cw_new_status_id
                                }
                            }];
                            
                            updatedTicket = await cw.ServiceDeskAPI.Tickets.updateTicket(Number(message.inputs.ticketId),ops);
        
                        }catch(e) {
                            console.log("attachmentActions.js: error on updateTicket with ticketId " + message.inputs.ticketId);
                            console.error(e);
                
                            let text = "Sorry, I'm having trouble with that." + "<em> ";
                            text += e.message + " (" + e.code + ")</em>";
                            await bot.reply(message, {markdown: text});
                            
                            return;
                        }
                        
                        
                    }
                    
                    // note added
                    var newServiceNote;
                    if (message.inputs.cw_add_comment) {
        
                        // create a note to post to the ticket
                        let note = {
                            ticketId: message.inputs.ticketId,
                            text: message.inputs.cw_add_comment,
                            internalAnalysisFlag: (message.inputs.cw_comment_visibility == "private" ? true : false),
                            detailDescriptionFlag: (message.inputs.cw_comment_visibility == "public" ? true : false),
                            processNotifications: (message.inputs.cw_comment_visibility == "public" ? true : false),
                            member: {
                                id: cwPerson.id
                            }
                        }
                        
                        
                        // post the new note to the ticket
                        try {
                            newServiceNote = await cw.ServiceDeskAPI.ServiceNotes.createServiceNote(message.inputs.ticketId, note);
                            
                            console.log(newServiceNote);
                            
                        }catch(e) {
                            console.log("attachmentAction.js: error on createServiceNote with ticketId " + message.inputs.ticketId);
                            console.error(e);
                            
                            let text = "Sorry, I'm having trouble with that." + "<em> ";
                            text += e.message + " (" + e.code + ")</em>";
                            await bot.reply(message, {markdown: text});
                        
                            return;
                        }
                        
                    }
                    
                }
                var responseText = webexPerson.firstName +  "  " + webexPerson.lastName + " updated ticket #" + message.inputs.ticketId + ":";
                
                if (newServiceNote) {
                    responseText += "<blockquote>**"
                    if (message.inputs.cw_comment_visibility == 'public') {
                        responseText += "public comment"
                    } else {
                        responseText += "private note"
                    }
                    responseText += "**<br />" + newServiceNote.text + "</blockquote>";
                } else {
                    responseText += "<br />";
                }
                if (updatedTicket) {
                    responseText += "*changed status to " + utility.formatStatus(updatedTicket.status.name) + "*";
                }
                
                try {
                    // send new message
                    await bot.reply(message, {markdown: responseText});
                    
                    // delete the parent message (aka remove the form)
                    //await bot.deleteMessage({id: message.messageId});
                } catch(e) {
                    console.error(e);
                }
            
        }
        
    
    });
}

// Take a ConnectWise ticket Id and Webex Teams person Id and assign the ticket
//      to that person in ConnectWise
async function processCWTicketAssignSelf(cwTicketId, wtPersonId, bot, message) {
    // create API connection to CW
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
    
    // match person in Webex to person in CW via email == username
    let person = await bot.api.people.get(wtPersonId);
    let member_ident = person.emails[0].split('@')[0];
    try {
        var cwPerson = await cw.SystemAPI.Members.getMemberByIdentifier(member_ident);
        
    }catch(e) {
        console.log("attachmentAction.js: error finding ConnectWise member from identifier " + member_ident);
        console.error(e);
        
        let text = "Sorry, I'm having trouble with that. It seems like you may not have permissions to post to ConnectWise. " + "<em> ";
        text += e.message + " (" + e.code + ")</em>";
        await bot.reply(message, {markdown: text});
        
        return;
    }
    
    // Make API requests for ticket data
    try {
        var ticket = await cw.ServiceDeskAPI.Tickets.getTicketById(cwTicketId);
    }catch(e) {
        console.log("cw-ticket.js: error on getTicketById with ticketId " + cwTicketId);
        console.error(e);

        throw(e);
    }
    
    if (ticket.owner) {
        let space = await bot.api.rooms.get(message.channel);
        
        let text = "";
        if (space.type == 'group') {
            text += "<@personId:" + person.id + "|" + person.nickName + ">, **t";
        } else {
            text += "**T";
        }
        text += "icket #" + cwTicketId + "** is already assigned to **" + ticket.owner.name +  "**.";
        await bot.reply(message, {markdown: text});
        console.log("attachmentActions.js: processCWTicketAssignSelf() " + person.displayName + " attmpted to self assign #" + cwTicketId + " but was already assigned in CW.");
    } else {
        // make API request to update ticket
        try {
    
            let ops = [{
                op: "replace",
                path: "owner",
                value: {
                    id: cwPerson.id
                }
            }];
            
            await cw.ServiceDeskAPI.Tickets.updateTicket(Number(message.inputs.ticketId),ops);
    
        }catch(e) {
            console.log("attachmentActions.js: error on updateTicket with ticketId " + cwTicketId);
            console.error(e);
    
            let text = "Sorry, I'm having trouble with that." + "<em> ";
            text += e.message + " (" + e.code + ")</em>";
            await bot.reply(message, {markdown: text});
            
            return;
        }
        
        let text = ">**" + person.displayName + "** has picked up **ticket #" + cwTicketId + "**.";
        await bot.reply(message, {markdown: text});
        console.log("attachmentActions.js: processCWTicketAssignSelf() " + person.displayName + " self assigned #" + cwTicketId);
    }
    
    return;
}

// Find companys matching company_string and present them to the user for confirmation
//      that they want a notification to be added
async function processAddCWNotifications(company_string, bot, message) {
    // create API connection to CW
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
        "conditions": "name='" + company_string + "'",
    }
    
    try {
        var companies = await cw.CompanyAPI.Companies.getCompanies(params)

    }catch(e) {
        console.log("attachmentActions.js: processAddCWNotifications() ERROR getCompanies() " + company_string);
        console.error(e);
    
        throw(e);
    }
    
    if (companies.length == 0) {
        let text = "I was not able to find a company named <em>" + company_string +"</em> in ConnectWise.";
        await bot.reply(message, {markdown: text});
        
        return;
    }
    
    await sendConfirmCWNotifications(companies, bot, message);
    
}

// Send a confirmation message to the user after they requested notifications to be added
async function sendConfirmCWNotifications(companies, bot, message) {
    // Use adaptive cards templating
    var ACData = require("adaptivecards-templating");
    
    var templatePayload = {
        "type": "AdaptiveCard",
        "version": "1.1",
        "body": [
            {
                "type": "TextBlock",
                "size": "Medium",
                "weight": "Bolder",
                "text": "Confirm New Notification"
            },
            {
                "type": "Input.ChoiceSet",
                "choices": [
                    {
                        "$data": "{companies}",
                        "title": "{name + ' (cwID: ' + toString(id) + ')'}",
                        "value": "{toString(id)}"
                    }
                ],
                "id": "cw_confirm_company_id"
            }
        ],
        "actions": [
            {
                "type": "Action.Submit",
                "title": "Confirm", 
                "data": {
                    "id": "confirm_cw_notification"
                }
            }
        ]
    };
    
    var template = new ACData.Template(templatePayload);

    
    let context = new ACData.EvaluationContext();
    context.$root = {
        "companies": companies
    };
    
    context.registerFunction(
        "toString",
        (input) => {
            return input.toString();
        }
    )

    let card_attach = {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "content": template.expand(context)
    }

    let text = "<small>Please update your Webex Teams app to view this content.</small>";
    await bot.reply(message, {markdown: text, attachments: card_attach});
    await bot.deleteMessage({id: message.messageId });
    
}

// Recieve confirmation from the user after they were sent a confirmation
async function processConfirmCWNotifications(company_id, bot, message) {
    // check if this notification already exists in Mongoose
    var Notification = require('mongoose').model('Notification')
    let notify = await Notification.find({ company_id: company_id })
    
    // get company object from CW
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
        var company = await cw.CompanyAPI.Companies.getCompanyById(company_id);
    } catch(e) {
    
        
    }
        
    // if a notification already exists, do not allow another one to be created
    let text;
    if (notify.length) {
        text = "A notification already exists for " + company.name + " in ";
        
        let room = await bot.api.rooms.get(notify[0].room_id);
        text += room.title;
        
        if (room.teamId) {

            let team = await bot.api.teams.get(room.teamId);
            
            text += " [" + team.name + "]";
        }
        
    } else {
        text = "Adding notification for " + company.name;
    
        let newNotify = new Notification({ company_id: company.id, room_id: message.channel});
        newNotify.save();
    }
    
    await bot.reply(message, {markdown: text});
    await bot.deleteMessage({id: message.messageId });
    console.log(message);
    console.log("attachmentActions.js: processConfirmCWNotifications(): " + (await bot.api.people.get(message.personId)).displayName + " deleted notification for " + company.name);
    
}

// Delete a given notification ID from Mongoose, and then respond to the message
//   with a confirmation
async function processDeleteCWNotifications(notification_id, bot, message) {
    
    // find notification to delete
    var Notification = require('mongoose').model('Notification');
    let notify = await Notification.findByIdAndRemove(notification_id);
    
    // create API connection to CW
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
    
    let name;
    if (notify.company_id) {
        let c = await cw.CompanyAPI.Companies.getCompanyById(notify.company_id);
        
        name = c.name;
    // board fallback notification
    } else if (notify.board_id) {
        let b = await cw.ServiceDeskAPI.Boards.getBoardById(notify.board_id);
        
        name = "Fallback: Board " + b.name;
    // global fallback notification
    } else {

        name = "Fallback: <em>All notifications</em>"
    }
    
    let text = "Deleted notification for " + name;
    await bot.reply(message,{markdown: text});
    await bot.deleteMessage({id: message.messageId });
    console.log("attachmentActions.js: processDeleteCWNotifications(): " + (await bot.api.people.get(message.personId)).displayName + " deleted notification for " + name);
}

async function processMVSnapshot(cameraSerial, bot, message) {
    // Connect to Meraki API
    const meraki = require('meraki');
    const configuration = meraki.Configuration;
    if (process.env.MERAKI_BASEURI) {
        configuration.BASEURI = process.env.MERAKI_BASEURI;
    }
    configuration.xCiscoMerakiAPIKey = process.env.MERAKI_TOKEN;
    
    let networkId = "N_591660401045840345";
    
    // Get snapshot URL and live video link
    let input = {}
    input['networkId'] = networkId;
    input['serial'] = cameraSerial;
    
    let url = await meraki.CamerasController.generateNetworkCameraSnapshot(input);
    let videoLinkUrl = await meraki.CamerasController.getNetworkCameraVideoLink(input);
    
    let tempMessage = await bot.reply(message,{markdown:'Please wait about `5 seconds` while I locate your snapshot..'});
    await bot.deleteMessage({id: message.messageId });

    try {
        let cameraAnalyticsLive = await meraki.MVSenseController.getDeviceCameraAnalyticsLive(cameraSerial);
        var peopleCount = cameraAnalyticsLive.zones['0']['person'];
    } catch(e) {
        console.log('attachmentActions.js: processMVSnapshot() Meraki API getDeviceCameraAnalyticsLive call error');
        console.log(e);
    }

    
    // Get device data from Meraki
    try {
        var device = await meraki.DevicesController.getNetworkDevice({serial: cameraSerial, networkId: networkId});
        
        console.log('attachmentActions.js: processMVSnapshot() Meraki API call success');
    } catch(e) {
        console.log('attachmentActions.js: processMVSnapshot() Meraki API getNetworkDevice call error');
        console.log(e);
    }
    
    var text = "<strong>" + device.name + "</strong> detected ";
    if (peopleCount == 1) {
        text += "1 person.";
    } else {
        text += peopleCount + " people.";
    }
    text +=  " [Live Video](" + videoLinkUrl.url + ")"
    
    await sleep(5000);
    await bot.reply(message,{markdown: text, files:[url.url]});
    await bot.deleteMessage({id: tempMessage.id });

}

async function processMVInfo(cameraSerial, bot, message) {
    let networkId = "N_591660401045840345";
    
    // Connect to Meraki API
    const meraki = require('meraki');
    const configuration = meraki.Configuration;
    configuration.xCiscoMerakiAPIKey = process.env.MERAKI_TOKEN;
    
    // Get device data from Meraki
    try {
        var device = await meraki.DevicesController.getNetworkDevice({serial: cameraSerial, networkId: networkId});
        
        console.log('attachmentActions.js: processMVInfo() Meraki API call success');
    } catch(e) {
        console.log('attachmentActions.js: processMVInfo() Meraki API call error');
        console.log(e);
    }
    
    // Use adaptive cards templating
    var ACData = require("adaptivecards-templating");
    
    var templatePayload = {
        "type": "AdaptiveCard",
        "version": "1.1",
        "body": [
            {
                "type": "TextBlock",
                "size": "Medium",
                "weight": "Bolder",
                "text": "{title}"
            },
            {
                "type": "FactSet",
                "facts": [
                    {
                        "$data": "{properties}",
                        "title": "{key}:",
                        "value": "{value}"
                    }
                ]
            }
        ],
        "actions": [
            {
                "type": "Action.Submit",
                "title": "Snapshot",
                "data": {
                    "id": "submit_mv_list_snapshot",
                    "mv_list_serial": device.serial
                }
            }
        ]
    };
    
    var template = new ACData.Template(templatePayload);

    let context = new ACData.EvaluationContext();
    context.$root = {
        "title": device.name,
        "properties": [
            {
                "key": "Model",
                "value": device.model
            },
            {
                "key": "Serial",
                "value": device.serial
            },
            {
                "key": "MAC",
                "value": device.mac
            },
            {
                "key": "IP",
                "value": device.lanIp
            },
            {
                "key": "Firmware",
                "value": device.firmware
            },
            {
                "key": "Address",
                "value": device.address
            }
        ]
    };

    let card_attach = {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "content": template.expand(context)
    }
    
    let text = "<small>Please update your Webex Teams app to view this content.</small>";
    await bot.reply(message, {markdown: text, attachments: card_attach});
    await bot.deleteMessage({id: message.messageId });
    

}

/* related functions */

function sleep(ms){
    console.log("meraki-snapshot.js: sleeping " + ms + "ms")
    return new Promise(resolve=>{
       setTimeout(resolve,ms); 
    });
};