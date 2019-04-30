const path = require('path');
const fs = require('fs');
const gulp = require('gulp');
const assert = require('stream-assert');
const del = require('del');
const rev = require('gulp-rev');
const through = require('through2');
const revDistClean = require('..');
const mocha = require('mocha');
require('should');

const fixturesPath = path.join(__dirname, 'fixtures');
const buildPath = path.join(__dirname, 'build');
const manifestFile = path.join(buildPath, 'rev-manifest.json');

mocha.describe('gulp-rev-dist-clean', () => {
	mocha.describe('revDistClean()', () => {
		let countFiles;
		let countDirs;

		mocha.beforeEach(done => {
			del.sync([buildPath]);
			countFiles = 0;
			countDirs = 0;
			gulp
				.src([path.join(fixturesPath, '**/*')], {base: fixturesPath})
				.pipe(
					through.obj((file, enc, cb) => {
						countFiles += file.isDirectory() ? 0 : 1;
						countDirs += file.isDirectory() ? 1 : 0;
						return cb(null, file);
					})
				)
				.pipe(gulp.dest(buildPath))
				.pipe(rev())
				.pipe(gulp.dest(buildPath))
				.pipe(rev.manifest())
				.pipe(gulp.dest(buildPath))
				.pipe(assert.end(done));
		});

		mocha.afterEach(done => {
			del.sync([buildPath]);
			done();
		});

		mocha.it('should clean dist files', done => {
			fs.mkdirSync(path.join(buildPath, 'old'));
			fs.mkdirSync(path.join(buildPath, 'old/old'));
			fs.mkdirSync(path.join(buildPath, 'img/old'));
			fs.writeFileSync(path.join(buildPath, 'old.html'), 'remove-me');
			fs.writeFileSync(path.join(buildPath, 'js/old.js'), 'remove-me');
			fs.writeFileSync(path.join(buildPath, 'css/pages/old.css'), 'remove-me');
			fs.writeFileSync(path.join(buildPath, 'img/old/old.gif'), 'remove-me');
			fs.writeFileSync(path.join(buildPath, 'old/old/old'), 'remove-me');
			gulp
				.src([path.join(buildPath, '**/*')], {read: false})
				.pipe(revDistClean(manifestFile, {emitChunks: true}))
				// Original dirs
				// + original files
				// + revised files
				// + a manifest file
				// + a `old` empty of files
				// + a `old/old` directory empty of files
				// + a `img/old` directory empty of files
				.pipe(assert.length(countDirs + countFiles * 2 + 1 + 1 + 1 + 1))
				.pipe(assert.end(done));
		});

		mocha.it('should emit an error on missing manifest', done => {
			fs.unlinkSync(manifestFile);
			try {
				revDistClean(manifestFile);
			} catch (error) {
				error.message.should.eql(
					'gulp-rev-dist-clean: error while reading the specified manifest file. Is the path correct?'
				);
				done();
			}
		});
	});
});
