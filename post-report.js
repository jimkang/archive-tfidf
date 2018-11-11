/* global process */
var fs = require('fs');
var postIt = require('@jimkang/post-it');
var pluck = require('lodash.pluck');
var randomId = require('idmaker').randomId;
var sb = require('standard-bail')();
var config = require('./config');

// TODO: Make this a switch.
const baseURL = 'https://smidgeo.com/notes/deathmtn';
const title = 'deathmtn';

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
const mostRecentPagePostedAboutPath =
  metaDir + '/most-recent-page-posted-about.txt';
var mostRecentPagePostedAbout = -1;

if (fs.existsSync(mostRecentPagePostedAboutPath)) {
  mostRecentPagePostedAbout = +fs.readFileSync(mostRecentPagePostedAboutPath, {
    encoding: 'utf8'
  });
}

if (process.argv.length > 3) {
  pageToPostAbout = +process.argv[3];
} else {
  pageToPostAbout = mostRecentPagePostedAbout + 1;
}

var lastReportPage = +fs.readFileSync(metaDir + '/last-page.txt', {
  encoding: 'utf8'
});

if (isNaN(lastReportPage) || lastReportPage < 1) {
  console.error('Not enough pages in archive yet.');
  process.exit();
}

if (pageToPostAbout > lastReportPage) {
  console.error(
    `Page ${pageToPostAbout} does not exist; ${lastReportPage} is the latest page report.`
  );
  process.exit();
}
console.log(
  'Trying to read:',
  `${termDir}/page-${pageToPostAbout}-reports.json`
);
var reports = JSON.parse(
  fs.readFileSync(`${termDir}/page-${pageToPostAbout}-reports.json`, {
    encoding: 'utf8'
  })
);

//var mastodonText = formatReportsIntoText({ reports, termsPerDoc: 3 });
var twitterText = formatReportsIntoText({ reports });
var html = formatReportsIntoText({
  reports,
  useHTML: true,
  includeDocLinks: true,
  termsPerDoc: 5
});

// console.log('mastodonText', mastodonText);
// console.log('text length', mastodonText.length);
// console.log('html', html);

postIt(
  {
    id: 'tfidf-' + randomId(4),
    targets: [
      {
        type: 'archive',
        config: config.archive,
        text: html
      },
      /*
      {
        type: 'mastodon',
        config: config.mastodon,
        text: mastodonText.slice(0, 500)
      },
      */
      {
        type: 'twitter',
        config: config.twitter,
        text: twitterText.slice(0, 280)
      }
    ]
  },
  sb(updatePostingRecord, logError)
);

function updatePostingRecord() {
  console.log('Posted about page', pageToPostAbout);
  fs.writeFileSync(mostRecentPagePostedAboutPath, pageToPostAbout, {
    encoding: 'utf8'
  });
}

function logError(error) {
  console.log(error, error.stack);
}

function formatReportsIntoText({
  reports,
  useHTML = false,
  includeDocLinks = false,
  termsPerDoc = 2
}) {
  var br = '\n';
  if (useHTML) {
    br = '<br>\n';
  }
  var archiveLink = `${baseURL}/${pageToPostAbout}.html`;
  if (useHTML) {
    archiveLink = `<a href="${baseURL}/${pageToPostAbout}.html">${title} page ${pageToPostAbout}</a>`;
  }
  var text = `Salient terms at ${archiveLink}${br}${br}`;
  text += reports.map(getSummary).join(br + br);
  return text;

  function getSummary(report) {
    var summary = '';
    if (includeDocLinks) {
      let docURL = `${baseURL}/${report.id}.html`;
      if (useHTML) {
        summary += `<a href="${docURL}">`;
      } else {
        summary += docURL + ': ';
      }
    }

    summary += pluck(report.topTerms.slice(0, termsPerDoc), 'term').join(', ');

    if (includeDocLinks && useHTML) {
      summary += '</a>';
    }
    return summary;
  }
}
