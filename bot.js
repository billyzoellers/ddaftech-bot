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
if (process.env.MONGO_URI) {
    storage = new MongoDbStorage({
        url: process.env.MONGO_URI,
    });
}


const adapter = new WebexAdapter({
    secret: process.env.SECRET,
    access_token: process.env.access_token,
    public_address: process.env.public_address
})    


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
    
    console.log("got /cw webhook for ticketId " + req.body.ticketId);
    let ticketId = req.body.ticketId;
    
    let bot = await controller.spawn();

    controller.trigger('ticket_webhook', bot, ticketId);
    
    
});

/*
 * Database for storing custom information

var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/ddaftech-bot', {useNewUrlParser: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  
  // schema for notification
    var notificationSchema = new mongoose.Schema({
      name: String
    });
});
 */