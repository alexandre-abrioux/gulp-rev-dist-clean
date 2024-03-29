import del from "del";
import fs from "fs";
import gulp, { TaskFunction } from "gulp";
import gulpif from "gulp-if";
import rev from "gulp-rev";
import { init, write } from "gulp-sourcemaps";
import path from "path";
import through, { TransformCallback } from "through2";

// use "index" to replace module in jest.lib.config.ts
import revDistClean, { Options } from "../src/index";

const fixturesPath = path.join(__dirname, "fixtures");
const buildPath = path.join(__dirname, "build");
const manifestFile = path.join(buildPath, "rev-manifest.json");
let countFiles: number;
let countDirs: number;

const copyFixturesTask = (): TaskFunction => () => {
    countFiles = 0;
    countDirs = 0;
    return gulp
        .src([path.join(fixturesPath, "**/*")], { base: fixturesPath })
        .pipe(
            through.obj(
                // eslint-disable-next-line  @typescript-eslint/no-explicit-any
                (file: any, enc: BufferEncoding, cb: TransformCallback) => {
                    countFiles += file.isDirectory() ? 0 : 1;
                    countDirs += file.isDirectory() ? 1 : 0;
                    return cb(null, file);
                }
            )
        )
        .pipe(gulp.dest(buildPath));
};

const revTask =
    (enableSourcemaps = false): TaskFunction =>
    () =>
        gulp
            .src([path.join(buildPath, "**/*")], { base: buildPath })
            .pipe(gulpif(enableSourcemaps, init()))
            .pipe(rev())
            .pipe(gulpif(enableSourcemaps, write(".")))
            .pipe(gulp.dest(buildPath))
            .pipe(rev.manifest())
            .pipe(gulp.dest(buildPath));

const revDistCleanTask =
    (options?: Options): TaskFunction =>
    () =>
        gulp
            .src([path.join(buildPath, "**/*")], { read: false })
            .pipe(revDistClean(manifestFile, options));

const assertNbFiles = (expectedNbFiles: number, expectedNbDirs: number) => {
    let nbFiles = 0;
    let nbDirs = 0;
    return through.obj(
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        (file: any, enc: BufferEncoding, cb: TransformCallback) => {
            nbFiles += file.isDirectory() ? 0 : 1;
            nbDirs += file.isDirectory() ? 1 : 0;
            return cb(null, file);
        },
        (cb) => {
            expect(nbFiles).toEqual(expectedNbFiles);
            expect(nbDirs).toEqual(expectedNbDirs);
            cb();
        }
    );
};

const assertNbFilesForOptions = (
    done: jest.DoneCallback,
    expectedNbFiles: number,
    expectedNbDirs: number,
    revDistCleanOptions?: Options
) => {
    const assertTask = () =>
        gulp
            .src([path.join(buildPath, "**/*")], { read: false })
            .pipe(assertNbFiles(expectedNbFiles, expectedNbDirs));
    void gulp.series(revDistCleanTask(revDistCleanOptions), assertTask)(done);
};

describe("gulp-rev-dist-clean", function () {
    describe("revDistClean()", function () {
        beforeEach(function (done) {
            del.sync([buildPath]);
            const fixtureToBuildTask = copyFixturesTask();
            void gulp.series(fixtureToBuildTask, revTask())(done);
        });

        it("should clean dist files", function (done) {
            fs.mkdirSync(path.join(buildPath, "old"));
            fs.mkdirSync(path.join(buildPath, "old/old"));
            fs.mkdirSync(path.join(buildPath, "img/old"));
            fs.writeFileSync(path.join(buildPath, "old.html"), "remove-me");
            fs.writeFileSync(path.join(buildPath, "js/old.js"), "remove-me");
            fs.writeFileSync(
                path.join(buildPath, "css/pages/old.css"),
                "remove-me"
            );
            fs.writeFileSync(
                path.join(buildPath, "img/old/old.gif"),
                "remove-me"
            );
            fs.writeFileSync(path.join(buildPath, "old/old/old"), "remove-me");
            // - original files
            // - revised files
            // - a manifest file
            // - a `old` directory empty of files
            // - a `old/old` directory empty of files
            // - a `img/old` directory empty of files
            assertNbFilesForOptions(done, countFiles * 2 + 1, countDirs + 3);
        });

        it("should emit an error on missing manifest", function () {
            del.sync(manifestFile);
            expect(revDistClean.bind(revDistClean, manifestFile)).toThrow(
                "gulp-rev-dist-clean: error while reading the specified manifest file. Is the path correct? Error: ENOENT: no such file or directory"
            );
        });

        it("should clean original files", function (done) {
            // - revised files
            // - a manifest file
            assertNbFilesForOptions(done, countFiles + 1, countDirs, {
                keepOriginalFiles: false,
            });
        });

        it("should clean revision files", function (done) {
            // - original files
            // - a manifest file
            assertNbFilesForOptions(done, countFiles + 1, countDirs, {
                keepRenamedFiles: false,
            });
        });

        it("should clean manifest file", function (done) {
            // - original files
            // - revised files
            assertNbFilesForOptions(done, countFiles * 2, countDirs, {
                keepManifestFile: false,
            });
        });

        it("should clean map files by default", function (done) {
            del.sync([buildPath]);
            const assertTask = () =>
                gulp
                    .src([path.join(buildPath, "**/*")], { read: false })
                    // - original files
                    // - revised files
                    // - a manifest file
                    .pipe(assertNbFiles(countFiles * 2 + 1, countDirs));
            void gulp.series([
                copyFixturesTask(),
                revTask(true),
                revDistCleanTask(),
                assertTask,
            ])(done);
        });

        it("should keep map files", function (done) {
            del.sync([buildPath]);
            const assertTask = () =>
                gulp
                    .src([path.join(buildPath, "**/*")], { read: false })
                    // - original files
                    // - revised files
                    // - source map files
                    // - a manifest file
                    .pipe(assertNbFiles(countFiles * 3 + 1, countDirs));
            void gulp.series([
                copyFixturesTask(),
                revTask(true),
                revDistCleanTask({ keepSourceMapFiles: true }),
                assertTask,
            ])(done);
        });

        it("should not emit chunks by default", function (done) {
            del.sync([buildPath]);
            const assertTask = () =>
                gulp
                    .src([path.join(buildPath, "**/*")], { read: false })
                    .pipe(revDistClean(manifestFile))
                    .pipe(assertNbFiles(0, 0));
            void gulp.series([copyFixturesTask(), revTask(), assertTask])(done);
        });

        it("should emit chunks", function (done) {
            del.sync([buildPath]);
            const assertTask = () =>
                gulp
                    .src([path.join(buildPath, "**/*")], { read: false })
                    .pipe(revDistClean(manifestFile, { emitChunks: true }))
                    // - original files
                    // - revised files
                    // - a manifest file
                    .pipe(assertNbFiles(countFiles * 2 + 1, countDirs));
            void gulp.series([copyFixturesTask(), revTask(), assertTask])(done);
        });

        it("should output files", function (done) {
            const assertTask = (cb: gulp.TaskFunctionCallback) => {
                const fileExists = fs.existsSync(
                    path.join(buildPath, "img/first.png")
                );
                expect(fileExists).toBeTruthy();
                cb();
            };

            void gulp.series(revDistCleanTask(), assertTask)(done);
        });

        it("should pass down delOptions to del module", function (done) {
            // - original files
            // - revised files
            // - manifest file
            assertNbFilesForOptions(done, countFiles * 2 + 1, countDirs, {
                keepOriginalFiles: false,
                delOptions: { dryRun: true },
            });
        });
    });
});
