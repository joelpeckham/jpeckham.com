const cheerio = require('cheerio');
const build = require("./build.js").build;
const fs = require('fs');

let currentBuild = 0;
build(currentBuild);

const http = require('http');
const static = require('node-static');
const file = new static.Server('./build');
const server = http.createServer((req, res) => {
    if (req.url === '/buildStatus') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(currentBuild.toString());
    } else if (req.url === '/') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(fs.readFileSync('./build/index.html', 'utf8'));
    } else if(fs.existsSync('./build' + req.url)){
        file.serve(req, res);
    }
    else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404');
    }
});
server.listen(8080);
fs.watch('./pages', (eventType, filename) => {
    currentBuild++;
    build(currentBuild);
});
fs.watch('./rootFiles', (eventType, filename) => {
    currentBuild++;
    build(currentBuild);
});
console.log(`Dev Server Running at: http://localhost:8080`);
