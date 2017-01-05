'use strict';

const through = require('through2');
const _ = require('lodash');
const del = require('del');
const glob = require('glob-all');

module.exports = function (options) {
    options = options || {};
    options = _.defaults(options, {
        cleanGlobs: ['./*/**']
    });

    return through.obj(function (manifest, enc, cb) {
        var manifestContent = JSON.parse(manifest.contents.toString(enc));
        var allowedFiles = [];
        allowedFiles.push.apply(allowedFiles, _.keysIn(manifestContent));
        allowedFiles.push.apply(allowedFiles, _.valuesIn(manifestContent));
        var globOptions = {
            base: typeof manifest.base !== 'undefined' ? manifest.base : '.',
            cwd: typeof manifest.cwd !== 'undefined' ? manifest.cwd : '.',
            nodir: true
        };
        var files = glob.sync(options.cleanGlobs, globOptions);
        var filesToDel = [];
        files.forEach(function (file) {
            if (allowedFiles.indexOf(file) < 0)
                filesToDel.push(file);
        });
        del.sync(filesToDel, globOptions);
        cb();
    });
};