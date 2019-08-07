/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = function(controller) {
    
    /**
     *  Hears '/mv snapshot' without camera specified
     */
    controller.hears("/mv snapshot$", 'message,direct_message', async(bot, message) => {
       console.log("meraki-snapshot.js: heard snapshot with no camera specified");
       
       let text = "You need to specify a camera.";
       text += "<br />`snapshot <camera name>`: shows a snapshot of a Meraki camera";
       await bot.reply(message,{markdown: text});
       
    // controller 
    });
    
    /**
     * Hears '/mv snapshot <camera-name>'
     */
    controller.hears(new RegExp(/^\/mv snapshot (.*?)$/),'message,direct_message', async(bot, message) => {
        // Connect to Meraki API
        const meraki = require('meraki');
        const configuration = meraki.Configuration;
        configuration.xCiscoMerakiAPIKey = process.env.MERAKI_TOKEN;
        
        // Meraki network ID with cameras
        let networkId = "N_591660401045840345";
        
        // Find camera serial based on name
        var camerasInNetwork = await meraki.DevicesController.getNetworkDevices(networkId);
        var cameraNameInput = message.matches[1];
        console.log('meraki-snapshot.js: user requested camera named ' + cameraNameInput);
        
        var cameraSerial;
        if ( (cameraSerial = findCameraNameInList(cameraNameInput,camerasInNetwork)) ) {
            // Found camera
            console.log('meraki-snapshot.js: matched camera named ' + cameraNameInput + ' serial ' + cameraSerial);
            
            // Go ahead and request the snapshot
            let snapshotUrl = await getSnapshotUrl(cameraSerial,networkId);
            
            // Respond with count of people displayed on the camera
            let cameraAnalyticsLive = await meraki.MVSenseController.getDeviceCameraAnalyticsLive(cameraSerial);
            let peopleCount = cameraAnalyticsLive.zones['0']['person'];
            
            var text = "Detected ";
            if (peopleCount == 1) {
                text += "1 person";
            } else {
                text += peopleCount + " people";
            }
            text += " on " + cameraNameInput + ".";
            
            await bot.reply(message,text);
            
            // Now send the snapshot
            await sleep(4000);
            await bot.reply(message,{files:[snapshotUrl.url]});
            
        } else {
            // Didn't find camera
            console.log('meraki-snapshot.js: Unable to match camera');
            
            let text = "I couldn't find a camera named ";
            text +=cameraNameInput;
            
            await bot.reply(message,text);
        }
        
        
    // controller
    });

};


/**
 *  Related Functions
 */

function findCameraNameInList(cameraName,cameraList) {
    for (var i = 0; i < cameraList.length; i++) {
        if (cameraList[i].name == cameraName) {
            return cameraList[i].serial;   
        }
    }
};
 
 
async function getSnapshotUrl(cameraSerial,networkId) {
    // Connect to the Meraki API using 'node-meraki'
    const apiKey = process.env.MERAKI_TOKEN;
    const version = "v0";
    const target = "n51";
    const rateLimiter = {
        enabled: true
    };
    const baseUrl = "https://api.meraki.com";
    
    const nodemeraki = require("node-meraki")({
    version,
    apiKey,
    target,
    baseUrl,
    rateLimiter
    });
    
    console.log('meraki-snapshot.js: generating screenshot for ' + cameraSerial + " on network " + networkId);
    var url = await nodemeraki.postRaw({
        path: "api/v0/networks/"+ networkId + "/cameras/" + cameraSerial + "/snapshot"
    });
    
    return url;
};

function sleep(ms){
    console.log("meraki-snapshot.js: sleeping " + ms + "ms")
    return new Promise(resolve=>{
       setTimeout(resolve,ms); 
    });
};