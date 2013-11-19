
var VersionManager = {
    ignoredVersions: [],
    addIgnoredVersions: function (vers) {
        this.ignoredVersions.concat(vers);
    }
    isIgnored: function (ver) {
        return (this.ignoredVersions.indexOf(ver) != -1); 
    }
};

exports.VersionManager = VersionManager;
