/**
 * attachmentActions.js
 * handles all attachmentActions - when an adaptive card has inputs
 */

module.exports = function(controller) {
    
    controller.on('attachmentActions', async(bot, message) => {
        console.log("attachmentActions.js: recieved an attachment action");
        
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
            let person = await bot.api.people.get(message.personId);
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
            
            // create a note to post to the ticket
            let note = {
                ticketId: message.inputs.ticketId,
                text: message.inputs.cw_add_comment,
                internalAnalysisFlag: (message.inputs.cw_comment_visibility == "private" ? true : false),
                detailDescriptionFlag: (message.inputs.cw_comment_visibility == "public" ? true : false),
                member: {
                    id: cwPerson.id
                }
            }
            
            
            // post the new note to the ticket
            try {
                var newServiceNote = await cw.ServiceDeskAPI.ServiceNotes.createServiceNote(message.inputs.ticketId, note);
                
                console.log(newServiceNote);
                
                var text = person.firstName + " " + person.lastName + " added a note to ticket #" + message.inputs.ticketId;
                text += "<blockquote>" + newServiceNote.text + "</blockquote>";
                
            }catch(e) {
                console.log("attachmentAction.js: error on createServiceNote with ticketId " + message.inputs.ticketId);
                console.error(e);
                
                let text = "Sorry, I'm having trouble with that." + "<em> ";
                text += e.message + " (" + e.code + ")</em>";
                await bot.reply(message, {markdown: text});
            
                return;
            }

            
        }

        
        try {
            // send new message
            await bot.reply(message, {markdown: text});
            
            // delete the parent message (aka remove the form)
            //await bot.deleteMessage({id: message.messageId});
        } catch(e) {
            console.error(e);
        }
        
    
    });
}