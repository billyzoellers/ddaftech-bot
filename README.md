## BotKit bot named ddaftech@webex.bot
* Based on BotKit 4.9.0

### Features
* Connectwise integration
* Meraki MV camera demo
* IT related tools

### Changelog
##### v2.0.2
(Fixes) Cleanup: move Adaptive Cards for company ticket list, and add/remove notifications to lib/actemplates

##### v2.0.1
(New) Add `\cw tickets` command to use in single client rooms for list of all open tickets

(Fixes) `\cw mytickets` will no longer list tickets that were Merged or Cancelled

##### v2.0.0
(New) ConnectWise tickets and actions will now use Webex Teams threaded messages

(Fixes) Major code cleanup: all code now confirms to the AirBNB ESLint style guide