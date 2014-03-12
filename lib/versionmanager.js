/*
 * Copyright (C) 2012, 2014 DuckDuckGo, Inc.
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

exports.VersionManager = {
    majorUpdates: [],
    addMajorUpdate: function (vers) {
        this.majorUpdates = this.majorUpdates.concat(vers);
    },
    isMajorUpdate: function (ver) {
        return (this.majorUpdates.indexOf(ver) != -1);
    }
};

