//
// Command: help
//
module.exports = function (controller) {
  controller.hears(["^list cameras"], 'direct_mention,direct_message', function (bot, message) {
    
    // Determine the camera
    const meraki = require('meraki');
    const configuration = meraki.Configuration;
    
    configuration.xCiscoMerakiAPIKey = process.env.MERAKI_TOKEN;
    
    let networkId = 'N_591660401045840345';
    const promise = meraki.DevicesController.getNetworkDevices(networkId);
    promise.then((response) => {
          let text = "There are " + response.length + " cameras in your network:";
          
          for (var i=0; i < response.length; i++) {
            text += "\n - " + response[i].name
          }
          
          bot.reply(message, text);
      
    }, (err) => {
        console.log("Error listing devices");
        console.log(err);
    });
    
  });
}

