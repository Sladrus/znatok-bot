class Utils {
  async sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  convertStampDate(unixtimestamp) {
    // Months array
    var months_arr = [
      'Января',
      'Февраля',
      'Марта',
      'Апреля',
      'Мая',
      'Июня',
      'Июля',
      'Августа',
      'Сентября',
      'Октября',
      'Ноября',
      'Декабря',
    ];

    // Convert timestamp to milliseconds
    var date = new Date(unixtimestamp * 1000);

    // Year
    var year = date.getFullYear();

    // Month
    var month = months_arr[date.getMonth()];

    // Day
    var day = date.getDate();

    // Hours
    var hours = date.getHours();

    // Minutes
    var minutes = '0' + date.getMinutes();

    // Seconds
    var seconds = '0' + date.getSeconds();

    // Display date time in MM-dd-yyyy h:m:s format
    var fulldate =
      month +
      ' ' +
      day +
      '-' +
      year +
      ' ' +
      hours +
      ':' +
      minutes.substr(-2) +
      ':' +
      seconds.substr(-2);

    // final date
    var convdataTime = day + ' ' + month + ' ' + year + 'г.';
    return convdataTime;
  }
}

export default new Utils();
