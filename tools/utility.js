// tools.js
// ========
module.exports = {
    truncate_string: function (str, length, ending) {
        if (length == null) {
            length = 100;
        }
        if (ending == null) {
            ending = '...';
        }
        if (str.length > length) {
            return str.substring(0, length - ending.length) + ending;
        } else {
            return str;
        }
    },
    date_string_format_short: function (dateString) {
        let df = require ('dateformat');
        
        let date = new Date(dateString);
        date.setHours(date.getHours() - 5);
        
        return df(date, "m/d/yy");

    }
}