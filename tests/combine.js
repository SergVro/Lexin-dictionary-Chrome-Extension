require('fs').writeFileSync('tests/unit/all.js', 'define(' +
    JSON.stringify(require('glob').sync('tests/unit/**/!(all).js')
            .map(function (filename) { return filename.replace(/\.js$/, ''); }))
        .replace(/,/g, ',\n\t').replace(/\[/, '[\n\t').replace(/\]/, '\n]') +
    ',\nfunction() {_gaq=[];});\n', { encoding: 'utf-8' });

require('fs').writeFileSync('tests/functional/all.js', 'define(' +
    JSON.stringify(require('glob').sync('tests/functional/**/!(all).js')
            .map(function (filename) { return filename.replace(/\.js$/, ''); }))
        .replace(/,/g, ',\n\t').replace(/\[/, '[\n\t').replace(/\]/, '\n]') +
    ');\n', { encoding: 'utf-8' });