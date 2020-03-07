/**
 * attachmentActions.js
 * handles all attachmentActions - when an adaptive card has inputs
 */

module.exports = function(controller) {
    
    controller.on('attachmentActions', async(bot, message) => {
        console.log("attachmentActions.js: recieved an attachment action");

        switch(message.inputs.id) {
            case 'submit_mv_list_info':
                console.log("attachmentActions.js: for mv list info");
                await processMVInfo(message.inputs.mv_list_serial, bot, message);
                
                break;
            case 'submit_mv_list_snapshot':
                console.log("attachmentActions.js: for mv list snapshot");
                await processMVSnapshot(message.inputs.mv_list_serial, bot, message);
                
                break;
            default:
                // legacy CW stuff - need to sort better
                const cwutil = require('../tools/connectwise');
        
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
                    responseText += "*changed status to " + cwutil.formatStatus(updatedTicket.status.name) + "*";
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