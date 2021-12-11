const path = require('path');
const fs = require('fs');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const assert = require('stream-assert');
const del = require('del');
const rev = require('gulp-rev');
const through = require('through2');
const {expect} = require('chai');
const sourcemaps = require('gulp-sourcemaps');
const revDistClean = require('..');

const fixturesPath = path.join(__dirname, 'fixtures');
const buildPath = path.join(__dirname, 'build');
const manifestFile = path.join(buildPath, 'rev-manifest.json');
let countFiles;
let countDirs;

const buildDist = (done, enableSourcemaps = false) => {
    del.sync([buildPath]);
    countFiles = 0;
    countDirs = 0;
    gulp.src([path.join(fixturesPath, '**/*')], {base: fixturesPath})
        .pipe(
            through.obj((file, enc, cb) => {
                countFiles += file.isDirectory() ? 0 : 1;
                countDirs += file.isDirectory() ? 1 : 0;
                return cb(null, file);
            })
        )
        .pipe(gulp.dest(buildPath))
        .pipe(gulpif(enableSourcemaps, sourcemaps.init()))
        .pipe(rev())
        .pipe(gulpif(enableSourcemaps, sourcemaps.write('.')))
        .pipe(gulp.dest(buildPath))
        .pipe(rev.manifest())
        .pipe(gulp.dest(buildPath))
        .pipe(assert.end(done));
};

describe('gulp-rev-dist-clean', () => {
    describe('revDistClean()', () => {
        beforeEach((done) => {
            buildDist(done);
        });

        afterEach(() => {
            del.sync([buildPath]);
        });

        it('should clean dist files', (done) => {
            fs.mkdirSync(path.join(buildPath, 'old'));
            fs.mkdirSync(path.join(buildPath, 'old/old'));
            fs.mkdirSync(path.join(buildPath, 'img/old'));
            fs.writeFileSync(path.join(buildPath, 'old.html'), 'remove-me');
            fs.writeFileSync(path.join(buildPath, 'js/old.js'), 'remove-me');
            fs.writeFileSync(
                path.join(buildPath, 'css/pages/old.css'),
                'remove-me'
            );
            fs.writeFileSync(
                path.join(buildPath, 'img/old/old.gif'),
                'remove-me'
            );
            fs.writeFileSync(path.join(buildPath, 'old/old/old'), 'remove-me');
            gulp.src([path.join(buildPath, '**/*')], {read: false})
                .pipe(revDistClean(manifestFile, {emitChunks: true}))
                // Original dirs
                // + original files
                // + revised files
                // + a manifest file
                // + a `old` directory empty of files
                // + a `old/old` directory empty of files
                // + a `img/old` directory empty of files
                .pipe(assert.length(countDirs + countFiles * 2 + 1 + 1 + 1 + 1))
                .pipe(assert.end(done));
        });

        it('should emit an error on missing manifest', () => {
            fs.unlinkSync(manifestFile);
            expect(revDistClean.bind(revDistClean, manifestFile)).to.throw(
                'gulp-rev-dist-clean: error while reading the specified manifest file. Is the path correct?'
            );
        });

        it('should clean original files', (done) => {
            gulp.src([path.join(buildPath, '**/*')], {read: false})
                .pipe(
                    revDistClean(manifestFile, {
                        keepOriginalFiles: false,
                        emitChunks: true
                    })
                )
                // Original dirs
                // + revised files
                // + a manifest file
                .pipe(assert.length(countDirs + countFiles + 1))
                .pipe(assert.end(done));
        });

        it('should clean revision files', (done) => {
            gulp.src([path.join(buildPath, '**/*')], {read: false})
                .pipe(
                    revDistClean(manifestFile, {
                        keepRenamedFiles: false,
                        emitChunks: true
                    })
                )
                // Original dirs
                // + original files
                // + a manifest file
                .pipe(assert.length(countDirs + countFiles + 1))
                .pipe(assert.end(done));
        });

        it('should clean manifest file', (done) => {
            gulp.src([path.join(buildPath, '**/*')], {read: false})
                .pipe(
                    revDistClean(manifestFile, {
                        keepManifestFile: false,
                        emitChunks: true
                    })
                )
                // Original dirs
                // + original files
                // + revised files
                .pipe(assert.length(countDirs + countFiles * 2))
                .pipe(assert.end(done));
        });

        it('should clean map files by default', async () => {
            await new Promise((resolve) => {
                buildDist(resolve, true);
            });
            await new Promise((resolve, reject) => {
                gulp.src([path.join(buildPath, '**/*')], {read: false})
                    .pipe(revDistClean(manifestFile, {emitChunks: true}))
                    // Original dirs
                    // + original files
                    // + revised files
                    // + a manifest file
                    .pipe(assert.length(countDirs + countFiles * 2 + 1))
                    .on('assertion', reject)
                    .pipe(assert.end(resolve));
            });
        });

        it('should keep map files', async () => {
            await new Promise((resolve) => {
                buildDist(resolve, true);
            });
            await new Promise((resolve, reject) => {
                gulp.src([path.join(buildPath, '**/*')], {read: false})
                    .pipe(
                        revDistClean(manifestFile, {
                            keepSourceMapFiles: true,
                            emitChunks: true
                        })
                    )
                    // Original dirs
                    // + original files
                    // + revised files
                    // + source map files
                    // + a manifest file
                    .pipe(assert.length(countDirs + countFiles * 3 + 1))
                    .on('assertion', reject)
                    .pipe(assert.end(resolve));
            });
        });

        it('should output files', (done) => {
            gulp.src([path.join(buildPath, '**/*')], {read: false})
                .pipe(revDistClean(manifestFile))
                .pipe(
                    through.obj((chunk, enc, cb) => {
                        const fileExists = fs.existsSync(
                            path.join(buildPath, 'img/first.png')
                        );
                        expect(fileExists).to.be.true;
                        cb(null, chunk);
                    })
                )
                .pipe(assert.end(done));
        });

        it('should pass down delOptions to del module', (done) => {
            gulp.task('process', () =>
                gulp.src([path.join(buildPath, '**/*')], {read: false}).pipe(
                    revDistClean(manifestFile, {
                        keepOriginalFiles: false,
                        delOptions: {dryRun: true}
                    })
                )
            );
            gulp.task('assert', () =>
                gulp
                    .src([path.join(buildPath, '**/*')], {read: false})
                    // Nothing should be deleted
                    // Original dirs
                    // + original files
                    // + revised files
                    // + a manifest file
                    .pipe(assert.length(countDirs + countFiles * 2 + 1))
                    .pipe(assert.end(done))
            );
            gulp.task('test', gulp.series('process', 'assert'));
            gulp.task('test')();
        });
    });
});
