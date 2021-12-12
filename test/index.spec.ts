import through, {TransformCallback} from 'through2';
import path from 'path';
import fs from 'fs';
import gulp, {TaskFunction} from 'gulp';
import gulpif from 'gulp-if';
import del from 'del';
import rev from 'gulp-rev';
import {expect} from 'chai';
import {init, write} from 'gulp-sourcemaps';
import revDistClean, {Options} from '../src';
import {Done} from 'mocha';

const fixturesPath = path.join(__dirname, 'fixtures');
const buildPath = path.join(__dirname, 'build');
const manifestFile = path.join(buildPath, 'rev-manifest.json');
let countFiles: number;
let countDirs: number;

const copyFixturesTask = (): TaskFunction => () => {
    countFiles = 0;
    countDirs = 0;
    return gulp
        .src([path.join(fixturesPath, '**/*')], {base: fixturesPath})
        .pipe(
            through.obj(
                (file: any, enc: BufferEncoding, cb: TransformCallback) => {
                    countFiles += file.isDirectory() ? 0 : 1;
                    countDirs += file.isDirectory() ? 1 : 0;
                    return cb(null, file);
                }
            )
        )
        .pipe(gulp.dest(buildPath));
};

const revTask = (enableSourcemaps = false): TaskFunction => () =>
    gulp
        .src([path.join(buildPath, '**/*')], {base: buildPath})
        .pipe(gulpif(enableSourcemaps, init()))
        .pipe(rev())
        .pipe(gulpif(enableSourcemaps, write('.')))
        .pipe(gulp.dest(buildPath))
        .pipe(rev.manifest())
        .pipe(gulp.dest(buildPath));

const revDistCleanTask = (options?: Options): TaskFunction => () =>
    gulp
        .src([path.join(buildPath, '**/*')], {read: false})
        .pipe(revDistClean(manifestFile, options));

const assertNbFiles = (expectedNbFiles: number, expectedNbDirs: number) => {
    let nbFiles = 0;
    let nbDirs = 0;
    return through.obj(
        (file: any, enc: BufferEncoding, cb: TransformCallback) => {
            nbFiles += file.isDirectory() ? 0 : 1;
            nbDirs += file.isDirectory() ? 1 : 0;
            return cb(null, file);
        },
        (cb) => {
            expect(nbFiles).to.eq(expectedNbFiles);
            expect(nbDirs).to.eq(expectedNbDirs);
            cb();
        }
    );
};

const assertNbFilesForOptions = (
    done: Done,
    expectedNbFiles: number,
    expectedNbDirs: number,
    revDistCleanOptions?: Options
) => {
    const assertTask = () =>
        gulp
            .src([path.join(buildPath, '**/*')], {read: false})
            .pipe(assertNbFiles(expectedNbFiles, expectedNbDirs));
    void gulp.series(revDistCleanTask(revDistCleanOptions), assertTask)(done);
};

describe('gulp-rev-dist-clean', () => {
    describe('revDistClean()', () => {
        beforeEach((done) => {
            del.sync([buildPath]);
            const fixtureToBuildTask = copyFixturesTask();
            void gulp.series(fixtureToBuildTask, revTask())(done);
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
            // - original files
            // - revised files
            // - a manifest file
            // - a `old` directory empty of files
            // - a `old/old` directory empty of files
            // - a `img/old` directory empty of files
            assertNbFilesForOptions(done, countFiles * 2 + 1, countDirs + 3);
        });

        it('should emit an error on missing manifest', () => {
            del.sync(manifestFile);
            expect(revDistClean.bind(revDistClean, manifestFile)).to.throw(
                'gulp-rev-dist-clean: error while reading the specified manifest file. Is the path correct? Error: ENOENT: no such file or directory'
            );
        });

        it('should clean original files', (done) => {
            // - revised files
            // - a manifest file
            assertNbFilesForOptions(done, countFiles + 1, countDirs, {
                keepOriginalFiles: false
            });
        });

        it('should clean revision files', (done) => {
            // - original files
            // - a manifest file
            assertNbFilesForOptions(done, countFiles + 1, countDirs, {
                keepRenamedFiles: false
            });
        });

        it('should clean manifest file', (done) => {
            // - original files
            // - revised files
            assertNbFilesForOptions(done, countFiles * 2, countDirs, {
                keepManifestFile: false
            });
        });

        it('should clean map files by default', (done) => {
            del.sync([buildPath]);
            const assertTask = () =>
                gulp
                    .src([path.join(buildPath, '**/*')], {read: false})
                    // - original files
                    // - revised files
                    // - a manifest file
                    .pipe(assertNbFiles(countFiles * 2 + 1, countDirs));
            void gulp.series([
                copyFixturesTask(),
                revTask(true),
                revDistCleanTask(),
                assertTask
            ])(done);
        });

        it('should keep map files', (done) => {
            del.sync([buildPath]);
            const assertTask = () =>
                gulp
                    .src([path.join(buildPath, '**/*')], {read: false})
                    // - original files
                    // - revised files
                    // - source map files
                    // - a manifest file
                    .pipe(assertNbFiles(countFiles * 3 + 1, countDirs));
            void gulp.series([
                copyFixturesTask(),
                revTask(true),
                revDistCleanTask({keepSourceMapFiles: true}),
                assertTask
            ])(done);
        });

        it('should not emit chunks by default', (done) => {
            del.sync([buildPath]);
            const assertTask = () =>
                gulp
                    .src([path.join(buildPath, '**/*')], {read: false})
                    .pipe(revDistClean(manifestFile))
                    .pipe(assertNbFiles(0, 0));
            void gulp.series([copyFixturesTask(), revTask(), assertTask])(done);
        });

        it('should emit chunks', (done) => {
            del.sync([buildPath]);
            const assertTask = () =>
                gulp
                    .src([path.join(buildPath, '**/*')], {read: false})
                    .pipe(revDistClean(manifestFile, {emitChunks: true}))
                    // - original files
                    // - revised files
                    // - a manifest file
                    .pipe(assertNbFiles(countFiles * 2 + 1, countDirs));
            void gulp.series([copyFixturesTask(), revTask(), assertTask])(done);
        });

        it('should output files', (done) => {
            const assertTask = (cb: gulp.TaskFunctionCallback) => {
                const fileExists = fs.existsSync(
                    path.join(buildPath, 'img/first.png')
                );
                expect(fileExists).to.eq(true);
                cb();
            };

            void gulp.series(revDistCleanTask(), assertTask)(done);
        });

        it('should pass down delOptions to del module', (done) => {
            // - original files
            // - revised files
            // - manifest file
            assertNbFilesForOptions(done, countFiles * 2 + 1, countDirs, {
                keepOriginalFiles: false,
                delOptions: {dryRun: true}
            });
        });
    });
});
