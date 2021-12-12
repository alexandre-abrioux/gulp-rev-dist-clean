import fs from 'fs';
import path from 'path';
import del from 'del';
import through from 'through2';

export type Options = {
    keepOriginalFiles?: boolean;
    keepRenamedFiles?: boolean;
    keepSourceMapFiles?: boolean;
    keepManifestFile?: boolean;
    emitChunks?: boolean;
    delOptions?: del.Options;
};

const defaultOptions: Options = {
    keepOriginalFiles: true,
    keepRenamedFiles: true,
    keepSourceMapFiles: false,
    keepManifestFile: true,
    emitChunks: false,
    delOptions: {}
};

export default function revDistClean(
    revManifestFile: string,
    options?: Options
) {
    const filesToDel: string[] = [];
    const allowedFiles: string[] = [];
    const _options: Options = {
        ...defaultOptions,
        ...options
    };
    try {
        const revManifestContent: Record<string, string> = JSON.parse(
            fs.readFileSync(revManifestFile, {encoding: 'utf8'})
        );
        if (_options.keepManifestFile) {
            allowedFiles.push(path.basename(revManifestFile));
        }

        for (const asset in revManifestContent) {
            /* istanbul ignore else */
            if (
                Object.prototype.hasOwnProperty.call(revManifestContent, asset)
            ) {
                if (_options.keepOriginalFiles) {
                    allowedFiles.push(asset.replace(/\\/g, '/'));
                }

                if (_options.keepRenamedFiles) {
                    allowedFiles.push(
                        revManifestContent[asset].replace(/\\/g, '/')
                    );
                }

                if (_options.keepSourceMapFiles) {
                    allowedFiles.push(
                        `${revManifestContent[asset].replace(/\\/g, '/')}.map`
                    );
                }
            }
        }
    } catch (error) {
        throw new Error(
            `gulp-rev-dist-clean: error while reading the specified manifest file. Is the path correct? ${
                error as string
            }`
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

            if (_options.emitChunks) {
                return cb(null, file);
            }

            return cb();
        },
        (cb) => {
            del.sync(filesToDel, _options.delOptions);
            return cb();
        }
    );
}
