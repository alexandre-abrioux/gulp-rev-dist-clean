'use strict';

const fs = require('fs');
const path = require('path');
const del = require('del');
const through = require('through2');

module.exports = function (revManifestFile, options) {
    const filesToDel = [];
    const allowedFiles = [];
    options = {
        keepOriginalFiles: true,
        keepRenamedFiles: true,
        keepManifestFile: true,
        emitChunks: false,
        forceDelete: false,
        ...options
    };
    try {
        const revManifestContent = JSON.parse(
            fs.readFileSync(revManifestFile, {encoding: 'utf8'})
        );
        if (options.keepManifestFile) {
            allowedFiles.push(path.basename(revManifestFile));
        }

        for (const asset in revManifestContent) {
            if (
                Object.prototype.hasOwnProperty.call(revManifestContent, asset)
            ) {
                if (options.keepOriginalFiles) {
                    allowedFiles.push(asset.replace(/\\/g, '/'));
                }

                if (options.keepRenamedFiles) {
                    allowedFiles.push(
                        revManifestContent[asset].replace(/\\/g, '/')
                    );
                }
            }
        }
    } catch {
        throw new Error(
            'gulp-rev-dist-clean: error while reading the specified manifest file. Is the path correct?'
        );
    }

    return through.obj(
        (file, enc, cb) => {
            if (
                !allowedFiles.includes(file.relative.replace(/\\/g, '/')) &&
                fs.lstatSync(file.path).isFile()
            ) {
                filesToDel.push(file.path);
                return cb();
            }

            if (options.emitChunks) {
                return cb(null, file);
            }

            return cb();
        },
        (cb) => {
            del.sync(filesToDel, { force: options.forceDelete });
            return cb();
        }
    );
};
