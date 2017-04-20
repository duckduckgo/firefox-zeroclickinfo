/*
 * Copyright (C) 2016 DuckDuckGo, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var ss = require("sdk/simple-storage");

var atbTime = {
    oneWeek     : 604800000,
    oneDay      : 86400000,
    oneHour     : 3600000,
    oneMinute   : 60000,
    estEpoch    : 1456290000000
}

var timeSinceEpoch = getTimeSinceEpoch(),
    majorVersion = Math.ceil(timeSinceEpoch / atbTime.oneWeek),
    minorVersion = Math.ceil(timeSinceEpoch % atbTime.oneWeek / atbTime.oneDay);


function getTimeSinceEpoch() {
    var localDate = new Date(),
        localTime = localDate.getTime(),
        utcTime = localTime + (localDate.getTimezoneOffset() * atbTime.oneMinute),
        est = new Date(utcTime + (atbTime.oneHour * -5)),
        dstStartDay = 13 - ((est.getFullYear() - 2016) % 6),
        dstStopDay = 6 - ((est.getFullYear() - 2016) % 6),
        isDST = (est.getMonth() > 2 || (est.getMonth() == 2 && est.getDate() >= dstStartDay)) && (est.getMonth() < 10 || (est.getMonth() == 10 && est.getDate() < dstStopDay)),
        epoch = isDST ? atbTime.estEpoch - atbTime.oneHour : atbTime.estEpoch;

    return new Date().getTime() - epoch;
}

// caluclate the current ATB on install
exports.install = function () {
    return 'v' + majorVersion + '-' + minorVersion;
}

// caluclate the day of churn on uninstall
exports.uninstall = function () {
    var ogMajorVersion = ss.storage.atb.split('-')[0].slice(1),
        ogMinorVersion = ss.storage.atb.split('-')[1],
        majorDiff = majorVersion - ogMajorVersion,
        minorDiff = minorVersion - ogMinorVersion,
        dayOfChurn = majorDiff > 0 ? (7 * majorDiff) + Math.abs(minorDiff) : minorDiff;

    return dayOfChurn;

}
