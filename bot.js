//  __   __  ___        ___
// |__) /  \  |  |__/ |  |  
// |__) \__/  |  |  \ |  |  

// This is the main file for the ddaftech-bot bot.

// Import Botkit's core features
const { Botkit } = require('botkit');
const { BotkitCMSHelper } = require('botkit-plugin-cms');

// Import a platform-specific adapter for webex.

const { WebexAdapter } = require('botbuilder-adapter-webex');

const { MongoDbStorage } = require('botbuilder-storage-mongodb');

// Load process.env values from .env file
require('dotenv').config();

let storage = null;
if (process.env.MONGO_URL) {
    storage = new MongoDbStorage({
        url: process.env.MONGO_URL,
    });
}


const adapter = new WebexAdapter({
    secret: process.env.SECRET,
    access_token: process.env.access_token,
    public_address: process.env.public_address
})    

/*
 * Database for storing custom information
 */
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL, {useNewUrlParser: true, useFindAndModify: false});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  
  // schema for notification
    var notificationSchema = new mongoose.Schema({
      company_id: String,
      board_id: String,
      status_id: String,
      room_id: String,
      created_by_user_id: String
    });
    
    const Notification = mongoose.model('Notification', notificationSchema);
});

const controller = new Botkit({
    webhook_uri: '/api/messages',

    adapter: adapter,

    storage: storage
});

if (process.env.cms_uri) {
    controller.usePlugin(new BotkitCMSHelper({
        uri: process.env.cms_uri,
        token: process.env.cms_token,
    }));
}

// Once the bot has booted up its internal services, you can use them to do stuff.
controller.ready(() => {

    // load traditional developer-created local custom feature modules
    controller.loadModules(__dirname + '/features');

    /* catch-all that uses the CMS to trigger dialogs */
    if (controller.plugins.cms) {
        controller.on('message,direct_message', async (bot, message) => {
            let results = false;
            results = await controller.plugins.cms.testTrigger(bot, message);

            if (results !== false) {
                // do not continue middleware!
                return false;
            }
        });
    }

});

controller.webserver.get('/', (req, res) => {
    res.send(`This app is running Botkit ${ controller.version }.`);
});


/*
 * Temporary additional webhook for Adaptive Card responses
 */
controller.ready(async function() {
    await controller.adapter.registerAdaptiveCardWebhookSubscription('/api/messages');
});

/*
 * Recieve ConnectWise webhooks
 */
controller.webserver.post('/cw', async (req,res) => {
    
    res.status(200);
    res.send('ok');
    
    // get the callback data, and X-Content-Signature from headers
    let callback = req.body;
    let callbackXContentSignature = req.headers['x-content-signature'];
    
    // establish API connection to verify callback
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
    
    // if signature matches in callback
    if (await cw.utils.Callback.verifyCallback(callback,callbackXContentSignature) == false) {
        console.error('POST /cw webhook ERROR unable to verify. Request below');
        console.log(req);
        
        return;
    }
    
    if (callback.FromUrl != "connectwise.deandorton.com") {
        console.error('POST /cw webhook ERROR verified but sourced from wrong domain. Request below');
        console.log(req);
        
        return;
    }
    
    let ticketId = callback.ID;
    let action = callback.Action;
    console.log("POST /cw webhook verified for ticketId " + ticketId + " with action " + action);
    
    // do not send trigger on specific actions
    if (action == "deleted" || action == "updated") {
        console.log("POST /cw webhook not firing message for action " + action);
        return;
    }

    if (process.env.PROCESS_WEBHOOK == "no") {
        console.log("POST /cw webhook did not trigger bot due to PROCESS_WEBHOOK=no")
        return;
    }

    let bot = await controller.spawn();
    controller.trigger('ticket_webhook', bot, {ticketId, action});
    
});