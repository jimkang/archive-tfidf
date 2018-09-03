/* global process */
var fs = require('fs');
var postIt = require('@jimkang/post-it');

if (process.argv.length < 3) {
  console.error(
    'Usage: node post-report.js <root directory of archive maintained by static-web-archive> [lastReportPage, a number like 0 or 18]'
  );
  process.exit();
}

var archiveDir = process.argv[2];
var metaDir = archiveDir + '/meta';
var termDir = archiveDir + '/term-data';
var pageToPostAbout = 0;
const mostRecentPagePostedAboutPath = metaDir + '/most-recent-page-posted-about.txt';
var mostRecentPagePostedAbout = -1;

if (fs.existsSync(mostRecentPagePostedAboutPath)) {
  mostRecentPagePostedAbout = +fs.readFileSync(mostRecentPagePostedAboutPath, { encoding: 'utf8' });
}

if (process.argv.length > 3) {
  pageToPostAbout = +process.argv[3];
} else {
  pageToPostAbout = mostRecentPagePostedAbout + 1;
}

var lastReportPage = +fs.readFileSync(metaDir + '/last-page.txt', { encoding: 'utf8' });

if (isNaN(lastReportPage) || lastReportPage < 1) {
  console.error('Not enough pages in archive yet.');
  process.exit();
}

if (pageToPostAbout > lastReportPage) {
  console.error(`Page ${pageToPostAbout} does not exist; ${lastReportPage} is the latest page report.`);
  process.exit();
}
console.log('Trying to read:', `${termDir}/page-${pageToPostAbout}-reports.json`);
var reports = JSON.parse(fs.readFileSync(
  `${termDir}/page-${pageToPostAbout}-reports.json`,
  { encoding: 'utf8' }
));

var text = formatReportsIntoText(reports);

console.log('reports', reports);

function formatReportsIntoText(reports, useHTML = false) {
  var br = '\n'; 
  if (useHTML) {
    br = '<br>\n';
  }
  var archiveLink = `${baseURL}/${pageToPostAbout}.html`;
  if (useHTML) {
    archiveLink = `<a href="${baseURL}/${pageToPostAbout}.html">${title}</a>`;
  }
  var text = `Salient terms at ${archiveLink}${br}`;
}

