// tools.js
// ========
const df = require('dateformat');

module.exports = {
  truncate_string: (str, len, end) => {
    const length = (len == null) ? 100 : len;
    const ending = (end == null) ? '...' : end;

    if (str.length > length) {
      return str.substring(0, length - ending.length) + ending;
    }
    return str;
  },
  date_string_format_short: (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() - 5);

    return df(date, 'm/d/yy');
  },
  date_string_format_long_with_time: (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() - 5);

    return df(date, 'ddd, m/d/yy h:MM TT');
  },
  /*
   * formatStatus(status) -> takes 'status' as a string, and returns a better formated string
   *
   *      Input: (String)
   *      Output: (String) with excess formatting removed
   */
  formatStatus: (status) => {
    const str = status.replace('>', '');

    if (status === 'Customer Updated') {
      return 'Updated';
    }

    return str;
  },
};
