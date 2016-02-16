var getYearRange = function (range) {
    var currentDate = new Date();
    var year = currentDate.getFullYear();
    var years = [];
    for (var i = year - range; i < year + range; i++) {
        years.push(i);
    }
    return years;
}

var getYears = function (n) {
    var currentDate = new Date();
    var year = currentDate.getFullYear();
    var years = [];
    for (var i = year; i < year + n; i++) {
        years.push(i);
    }
    return years;
}