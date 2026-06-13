const MONTHS = [
  'Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie',
  'Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie',
];

function romanianDate(d = new Date()) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function touchArticleDate(db, articleId) {
  db.prepare('UPDATE articles SET date = ? WHERE id = ?').run(romanianDate(), articleId);
}

module.exports = { romanianDate, touchArticleDate };
