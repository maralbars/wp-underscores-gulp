/*

Sources

Part 1: https://css-tricks.com/gulp-for-wordpress-initial-setup/
Part 2: https://css-tricks.com/gulp-for-wordpress-creating-the-tasks/

*/

import gulp from 'gulp';
import gulpSass from 'gulp-sass';
import dartSass from 'node-sass';
import cleanCss from 'gulp-clean-css';
import gulpif from 'gulp-if';
import sourcemaps from 'gulp-sourcemaps';
import imagemin from 'gulp-imagemin';
import del from 'del';
import webpack from 'webpack-stream';
import uglify from 'gulp-uglify';
import named from 'vinyl-named';
import browserSync from 'browser-sync';
import zip from 'gulp-zip';
import replace from 'gulp-replace';
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import wpPot from 'gulp-wp-pot'
import autoprefixer from 'gulp-autoprefixer'



// const name = 'winner';
const name = 'starter';
const site_url = 'localhost:8888/default.local';
const sass = gulpSass(dartSass);
const server = browserSync.create();
const PRODUCTION = yargs(hideBin(process.argv)).argv.prod === 'true' ? true : false;
// console.log(PRODUCTION);


const paths = {
    styles: {
        src: ['src/sass/*'],
        dest: './'
    },
    images: {
        src: 'src/images/**/*.{jpg,jpeg,png,svg,gif}',
        dest: 'assets/images'
    },
    scrips: {
        src: ['src/js/**/*'],
        dest: './js'
    },
    other: {
        src: ['src/**/*', '!src/{images,js,scss,sass}', '!src/{images,js,scss,sass}/**/*'],
        dest: 'assets'
    },
    package: {
        src: [
            "**/*",
            "!.vscode",
            "!node_modules{,/**}",
            "!packaged{,/**}",
            "!src{,/**}",
            "!.babelrc",
            "!.gitignore",
            "!gulpfile.babel.js",
            "!package.json",
            "!package-lock.json"
        ],
        dest: 'packaged'
    }
}

// Подготовка стандартной Undrscores

export const dirs = () => {
    return gulp.src('*.*', { read: false })
        // source
        .pipe(gulp.dest('./src'))
        .pipe(gulp.dest('./src/images'))
        .pipe(gulp.dest('./src/sass'))
        .pipe(gulp.dest('./src/js'))
        .pipe(gulp.dest('./src/fonts'))
        // dist
        .pipe(gulp.dest('./assets'))
        .pipe(gulp.dest('./assets/images'))
        .pipe(gulp.dest('./assets/js'))
        .pipe(gulp.dest('./assets/fonts'))
};

const replaceSass = () => gulp.src('sass/**/*').pipe(gulp.dest('src/sass/'))
const replaceJS = () => gulp.src('js/**/*').pipe(gulp.dest('src/js/'))
const delDef = () => del(['sass', 'js'])

export const prepare = gulp.series(replaceSass, replaceJS, delDef);

export const serve = (done) => {
    server.init({
        proxy: "http://" + site_url
    });
    done();
}

export const reload = (done) => {
    server.reload();
    done();
}

export const clean = () => {
    return del(['assets']);
}

export const styles = (done) => {
    return gulp.src(paths.styles.src)
        .pipe(gulpif(!PRODUCTION, sourcemaps.init()))
        .pipe(sass().on('error', sass.logError))
        .pipe(gulpif(PRODUCTION, cleanCss({ compatibility: 'ie8' })))
        .pipe(autoprefixer({
            overrideBrowserslist: ['last 21 versions'],
            cascade: false
        }))
        .pipe(gulpif(!PRODUCTION, sourcemaps.write(paths.styles.dest)))
        .pipe(gulp.dest(paths.styles.dest))
        .pipe(server.stream());
}

export const images = () => {
    return gulp.src(paths.images.src)
        .pipe(gulpif(PRODUCTION, imagemin()))
        .pipe(gulp.dest(paths.images.dest));
}

export const watch = () => {
    gulp.watch('src/sass/**/*.scss', styles);
    gulp.watch('src/js/**/*.js', gulp.series(scripts, reload));
    gulp.watch('**/*.php', reload);
    gulp.watch(paths.images.src, gulp.series(images, reload));
    gulp.watch(paths.other.src, gulp.series(copy, reload));
}


export const copy = () => {
    return gulp.src(paths.other.src)
        .pipe(gulp.dest(paths.other.dest));
}

export const scripts = () => {
    return gulp.src(paths.scrips.src)
        .pipe(named())
        .pipe(webpack({
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: ['@babel/preset-env']
                            }
                        }
                    }
                ]
            },
            output: {
                filename: '[name].js'
            },
            externals: {
                jquery: 'jQuery'
            },
            devtool: !PRODUCTION ? 'inline-source-map' : false
        }))
        .pipe(gulpif(PRODUCTION, uglify()))
        .pipe(gulp.dest(paths.scrips.dest));
}

export const compress = () => {
    return gulp.src(paths.package.src)
        .pipe(replace('starter', name))
        .pipe(zip(`${name}.zip`))
        .pipe(gulp.dest(paths.package.dest));
}

export const pot = () => {
    return gulp.src("**/*.php")
        .pipe(
            wpPot({
                domain: name,
                package: name
            })
        )
        .pipe(gulp.dest(`languages/${name}.pot`));
};

export const dev = gulp.series(clean, gulp.parallel(styles, scripts, images, copy), serve, watch);
export const build = gulp.series(clean, gulp.parallel(styles, scripts, images, copy), pot);
export const bundle = gulp.series(build, compress);

export default dev;