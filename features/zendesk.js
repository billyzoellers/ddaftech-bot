/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {
    
    controller.hears(['zendesk'],'message,direct_message', async(bot, message) => {
        
        var text = "I've heard about ZenDesk. It's very user friendly but doesn't sound like something you would want to use. Try [this](https://connectwise.deandorton.com) instead!";
        
        await bot.reply(message, {markdown: text});
        
    // controller
    });
    

}
