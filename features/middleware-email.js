module.exports = function(controller) {
    
    controller.middleware.ingest.use(async (bot, message, next) => {

        if (message.type == 'self_message' || message.type == "attachmentActions") {
            next();
            return;
        }
        
        const PERMITTED_DOMAIN = process.env.PERMITTED_DOMAIN;
        let email_domain = message.personEmail.split("@")[1];

        if (email_domain == PERMITTED_DOMAIN) {
            next();
            return;
        }
        
        console.log("MESSAGE FROM EXTERNAL USER");
        message.type = "external_user_message";
        
        next();

    });
    
    controller.on('external_user_message', async(bot, message) => {

        var text = "Sorry, I am only available for the technology team."
        await bot.reply(message, text);
    });
}