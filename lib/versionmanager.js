
var VersionManager = {
    majorUpdates: [],
    addMajorUpdate: function (vers) {
        this.majorUpdates = this.majorUpdates.concat(vers);
    },
    isMajorUpdate: function (ver) {
        return (this.majorUpdates.indexOf(ver) != -1);
    }
};

exports.VersionManager = VersionManager;
