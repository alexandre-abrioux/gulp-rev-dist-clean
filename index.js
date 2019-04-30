'use strict';

const fs = require('fs');
const path = require('path');
const del = require('del');
const through = require('through2');

module.exports = function(revManifestFile, opts) {
	const filesToDel = [];
	const allowedFiles = [];
	opts = Object.assign(
		{
			keepOriginalFiles: true,
			keepRenamedFiles: true,
			keepManifestFile: true,
			emitChunks: false
		},
		opts
	);
	try {
		const revManifestContent = JSON.parse(
			fs.readFileSync(revManifestFile, {encoding: 'utf8'})
		);
		if (opts.keepManifestFile) {
			allowedFiles.push(path.basename(revManifestFile));
		}

		for (const asset in revManifestContent) {
			if (Object.prototype.hasOwnProperty.call(revManifestContent, asset)) {
				if (opts.keepOriginalFiles) {
					allowedFiles.push(asset.replace(/\\/g, '/'));
				}

				if (opts.keepRenamedFiles) {
					allowedFiles.push(revManifestContent[asset].replace(/\\/g, '/'));
				}
			}
		}
	} catch (error) {
		throw new Error(
			'gulp-rev-dist-clean: error while reading the specified manifest file. Is the path correct?'
		);
	}

	return through.obj(
		(file, enc, cb) => {
			if (
				allowedFiles.indexOf(file.relative.replace(/\\/g, '/')) < 0 &&
				fs.lstatSync(file.path).isFile()
			) {
				filesToDel.push(file.path);
				return cb();
			}

			if (opts.emitChunks) {
				return cb(null, file);
			}

			return cb();
		},
		cb => {
			del.sync(filesToDel);
			return cb();
		}
	);
};
