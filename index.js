'use strict';

const del = require('del');
const fs = require('fs');
const through = require('through2');

module.exports = function (revManifestFile, opts) {
    opts = Object.assign({
        keepOriginalFiles: true,
        keepRenamedFiles: true
    }, opts);
    try {
        var revManifestContent = JSON.parse(fs.readFileSync(revManifestFile, {encoding: "utf8"}));
        var allowedFiles = [];
        for (var asset in revManifestContent) {
            if (opts.keepOriginalFiles)
                allowedFiles.push(asset.replace(/\\/g, '/'));
            if (opts.keepRenamedFiles)
                allowedFiles.push(revManifestContent[asset].replace(/\\/g, '/'));
        }
        var filesToDel = [];
    } catch (err) {
        console.error('Error while reading the specified manifest file (is the path correct?).');
        throw err;
    }
    return through.obj(function (file, enc, cb) {
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