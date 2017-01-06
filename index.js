'use strict';

const del = require('del');
const fs = require('fs');
const through = require('through2');

module.exports = function (revManifestFile) {
    try {
        var revManifestContent = JSON.parse(fs.readFileSync(revManifestFile, {encoding: "utf8"}));
        var allowedFiles = [];
        for (var asset in revManifestContent) {
            if (revManifestContent.hasOwnProperty(asset)) {
                allowedFiles.push(asset);
                allowedFiles.push(revManifestContent[asset]);
            }
        }
        var filesToDel = [];
    } catch (err) {
        console.error('Error while reading the specified manifest file (is the path correct?).');
        throw err;
    }
    return through.obj(function (file, enc, cb) {
        // replace backslashes with forward slashes for Windows systems
        if (allowedFiles.indexOf(file.relative.replace(/\\/g, '/')) < 0 && fs.lstatSync(file.path).isFile()) {
            filesToDel.push(file.path);
            return cb();
        }
        return cb(null, file)
    }, function (cb) {
        del.sync(filesToDel);
        return cb();
    });
};