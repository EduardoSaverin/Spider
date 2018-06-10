/**
 * Do not set a high nesting level or leave the spider running for more than a few seconds.
 * It is not polite to overload a server with thousands of requests.
 * In some circumstances this can also be considered illegal. Spider responsibly!
 */
const utilities = require('./utilities');
const fs = require('fs');
const request = require('request')
const mkdirp = require('mkdirp');
const path = require('path');
function saveFile(filename, contents, callback) {
    mkdirp(path.dirname(filename), err => {
        if (err) {
            return callback(err);
        }
        fs.writeFile(filename, contents, callback);
    });
}

function download(url, filename, callback) {
    console.log(`Downloading ${url}`);
    request(url, (err, response, body) => {
        if (err) {
            return callback(err);
        }
        saveFile(filename, body, err => {
            if (err) {
                return callback(err);
            }
            console.log(`Downloaded and saved: ${url}`);
            callback(null, body);
        });
    });
}
// Serial Download
/**
function spiderLinks(currentUrl, body, nesting, callback) {
    if (nesting === 0) {
        return process.nextTick(callback);
    }
    const links = utilities.getPageLinks(currentUrl, body);  //[1] 
    function iterate(index) {                                //[2] 
        if (index === links.length) {
            return callback();
        }

        spider(links[index], nesting - 1, err => {             //[3] 
            if (err) {
                return callback(err);
            }
            iterate(index + 1);
        });
    }
    iterate(0);                                              //[4] 
}
*/
// Parallel Download Support
function spiderLinks(currentUrl, body, nesting, callback) {
    if (nesting === 0) {
        return process.nextTick(callback);
    }
    const links = utilities.getPageLinks(currentUrl, body);
    if (links.length === 0) {
        return process.nextTick(callback);
    }

    let completed = 0, hasErrors = false;

    function done(err) {
        if (err) {
            hasErrors = true;
            return callback(err);
        }
        if (++completed === links.length && !hasErrors) {
            return callback();
        }
    }

    links.forEach(link => {
        spider(link, nesting - 1, done);
    });
}
function spider(url, nesting, callback) {
    const filename = utilities.urlToFilename(url);
    fs.readFile(filename, 'utf8', (err, body) => {
        if (err) {
            if (err.code !== 'ENOENT') {
                return callback(err);
            }
            return download(url, filename, (err, body) => {
                if (err) {
                    return callback(err);
                }
                spiderLinks(url, body, nesting, callback);
            });
        }
        spiderLinks(url, body, nesting, callback);
    });
}
console.log(process.argv);
spider(process.argv[2], 5, (err) => {
    if (err) {
        console.log(err);
        process.exit();
    } else {
        console.log('Download complete');
    }
});