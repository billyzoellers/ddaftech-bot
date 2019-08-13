// tools.js
// ========
module.exports = {
    /* 
     * formatStatus(status) -> takes 'status' as a string, and returns a better formated string
     *
     *      Input: (String)
     *      Output: (String) with excess formatting removed
     */
    formatStatus: function (status) {
        let str = status.replace('>','')
        
        if (status == "Customer Updated") {
            return "Updated";
        }
        
        return str;
    },
    
    /*
     * dateToHumanReadable(date) -> accepts a date in ConnectWise format, returns the date with better formatting
     *
     *      Input: (Date)
     *      Output: (String)
     */
    dateToHumanReadable: function (date) {
        let df = require ('dateformat');
        
        date.setHours(date.getHours() - 4);
        
        let humanReadable = df(date, "ddd, m/d/yy h:MM TT");
        
        return humanReadable
    },
    
    /*
     * returnNoteName(ServiceNote) -> accepts a ConnectWise ServiceNote object and returns the associated member OR contact name
     *
     *      Input: (ServiceNote)
     *      Output: (String)
     */
    returnNoteName: function (note) {
        if (note.contact) {
            return note.contact.name;
        } else if (note.member) {
            return note.member.name;
        }
        
        return "Unspecified Name"
    },
    
    /*
     * returnTicketAssignee(ServiceTicket) -> accepts a ConncectWise ServiceTicket object and returns a formatted string
     *
     *      Input: (ServiceTicket)
     *      Output: (String) "Ticket Owner Name [Ticket Board Name]"
     */
    returnTicketAssignee: function (ticket) {
        let text = "";
        
        if (ticket.owner && !(ticket.owner.name == "undefined")) {
            text += ticket.owner.name + " ";
        }
        
        if (ticket.board) {
            text += "[" + ticket.board.name + "]";
        }
        
        return text;
    }
};