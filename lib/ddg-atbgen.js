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

exports.calc = {
    atbTime: {
        oneWeek     : 604800000,
        oneDay      : 86400000,
        oneHour     : 3600000,
        oneMinute   : 60000,
        estEpoch    : 1456290000000
    },
    timeSinceEpoch: function() {
        var localDate = new Date(),
            localTime = localDate.getTime(),
            utcTime = localTime + (localDate.getTimezoneOffset() * this.atbTime.oneMinute),
            est = new Date(utcTime + (this.atbTime.oneHour * -5)),
            dstStartDay = 13 - ((est.getFullYear() - 2016) % 6),
            dstStopDay = 6 - ((est.getFullYear() - 2016) % 6),
            isDST = (est.getMonth() > 2 || (est.getMonth() == 2 && est.getDate() >= dstStartDay)) && (est.getMonth() < 10 || (est.getMonth() == 10 && est.getDate() < dstStopDay)),
            epoch = isDST ? this.atbTime.estEpoch - this.atbTime.oneHour : this.atbTime.estEpoch;

        return new Date().getTime() - epoch;
    },
    majorVersion: function() {
        return Math.ceil(this.timeSinceEpoch() / this.atbTime.oneWeek);
    },
    minorVersion: function() {
        return Math.ceil(this.timeSinceEpoch() % this.atbTime.oneWeek / this.atbTime.oneDay);
    },
    atbDelta: function(atb) {
        var ogMajorVersion = atb.split('-')[0].slice(1),
            ogMinorVersion = atb.split('-')[1].match(/(\d+)/g)[0],
            majorVersion = this.majorVersion(),
            minorVersion = this.minorVersion(),
            majorDiff = majorVersion - ogMajorVersion,
            minorDiff = Math.abs(minorVersion - ogMinorVersion);

    return majorDiff > 0 ? (7 * majorDiff) + minorDiff : minorDiff;
    }

}
