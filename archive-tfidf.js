/* global process */
var fs = require('fs');
var Tracker = require('term-tracker');

if (process.argv.length < 3) {
  console.error('Usage: node archive-tfidf.js <root directory of archive maintained by static-web-archive> [lastPage, a number like 0 or 18]');
  process.exit();
}

var archiveDir = process.argv[2];
var lastPage;

if (process.argv.length > 3) {
  lastPage = +process.argv[3];
} else {
  lastPage = +fs.readFileSync(archiveDir + '/meta/last-page.txt', { encoding: 'utf8' });
}

if (isNaN(lastPage) || lastPage < 1) {
  console.error('Not enough pages in archive yet.');
  process.exit();
}

var pageToAdd = lastPage - 1;
var lastPageAdded;
const lastPageAddedPath = archiveDir + '/term-data/most-recent-page-added.txt';

if (fs.existsSync(lastPageAddedPath)) {
  lastPageAdded = +fs.readFileSync(lastPageAddedPath, { encoding: 'utf8' });
}

if (!isNaN(lastPageAdded) && lastPageAdded >= pageToAdd) {
  console.error('Already added this page, not enough has changed to run analysis.');
  process.exit();
}

var docs = JSON.parse(fs.readFileSync(`${archiveDir}/meta/${pageToAdd}.json`, { encoding: 'utf8' }));

var tracker = Tracker({
  storeFile: archiveDir + '/term-data/terms.json',
  textProp: 'caption'
});

docs.forEach(tracker.track);

var termsSorted = tracker.getTermsSortedByCount({ limit: 100 });
console.log(termsSorted);

tracker.save(calculate);

function calculate(error) {
  if (error) {
    console.error('Error saving term tracker:', error);
    return;
  }

  fs.writeFileSync(lastPageAddedPath, pageToAdd, { encoding: 'utf8' });
  
  docs.map(addTFIDF);
  var reports = docs.map(getDocReport);
  console.log(JSON.stringify(reports, null, 2));
}

function addTFIDF(doc) {
  var docMeta = tracker.getDocMeta({ id: doc.id });
  var analyses = [];
  if (docMeta.termCount > 0 && docs.length > 0) {
    for (var term in docMeta.countsPerTerm) {
      var termInfo = tracker.getTerm({ term });
      if (termInfo && termInfo.count > 0) {
        let tf = docMeta.countsPerTerm[term] / docMeta.termCount;
        let idf = Math.log(docs.length / termInfo.count);
        analyses.push({
          term,
          tf,
          idf,
          tfidf: tf * idf,
        });
      }
    }
  }
  doc.analyses = analyses;
}

function getDocReport(doc) {
  var sortedAnalyses = doc.analyses.sort(aGoesBeforeB).slice(0, 10);
  return {
    id: doc.id,
    topTerms: sortedAnalyses
  };
}

function aGoesBeforeB(a, b) {
  if (a.tfidf > b.tfidf) {
    return -1;
  } else {
    return 1;
  }
}

