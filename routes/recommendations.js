const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const SENTIMENT_SCORE = {
    positive:  1,
    neutral:   0,
    mixed:     0,
    sarcastic: -0.5,
    negative:  -1,
};

function cosineSimilarity(a, b) {
    const dot  = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
}

function buildArticleVector(article, sentimentMap, maxChars) {
    const total = article.likes + article.dislikes;
    const likeRatio = total > 0 ? article.likes / total : 0;
    const sentimentScore = sentimentMap[article.id] ?? 0;
    const lengthScore = maxChars > 0 ? article.total_chars / maxChars : 0;
    return [likeRatio, sentimentScore, lengthScore];
}

router.get('/', requireAuth, (req, res) => {
    const db = req.db;
    const userId = req.user.id;

    const articles = db.prepare(`
    SELECT a.id, a.title,
      COUNT(CASE WHEN r.type = 'like'    THEN 1 END) as likes,
      COUNT(CASE WHEN r.type = 'dislike' THEN 1 END) as dislikes,
      COALESCE(SUM(LENGTH(p.text)), 0) as total_chars
    FROM articles a
    LEFT JOIN reactions r ON r.article_id = a.id
    LEFT JOIN paragraphs p ON p.article_id = a.id
    WHERE a.status = 'finished'
    GROUP BY a.id
  `).all();

    const sentimentRows = db.prepare(`
    SELECT article_id, sentiment
    FROM article_comments
    WHERE sentiment IS NOT NULL
  `).all();

    const sentimentMap = {};
    const sentimentCount = {};
    for (const row of sentimentRows) {
        const score = SENTIMENT_SCORE[row.sentiment] ?? 0;
        sentimentMap[row.article_id]  = (sentimentMap[row.article_id]  || 0) + score;
        sentimentCount[row.article_id] = (sentimentCount[row.article_id] || 0) + 1;
    }
    for (const id of Object.keys(sentimentMap)) {
        sentimentMap[id] /= sentimentCount[id];
    }

    const userReactions = db.prepare(`
    SELECT article_id, type FROM reactions WHERE user_id = ?
  `).all(userId);

    const userComments = db.prepare(`
    SELECT article_id, sentiment FROM article_comments
    WHERE created_by = ? AND sentiment IS NOT NULL
  `).all(userId);

    const interactedIds = new Set([
        ...userReactions.map(r => r.article_id),
        ...userComments.map(c => c.article_id),
    ]);

    if (interactedIds.size === 0) {
        return res.json([]);
    }

    const maxChars = Math.max(...articles.map(a => a.total_chars), 1);
    const articleVectors = {};
    for (const a of articles) {
        articleVectors[a.id] = buildArticleVector(a, sentimentMap, maxChars);
    }

    const dims = 3;
    const userVector = new Array(dims).fill(0);
    let totalWeight = 0;

    for (const r of userReactions) {
        const weight = r.type === 'like' ? 1 : -1;
        const vec = articleVectors[r.article_id];
        if (!vec) continue;
        for (let i = 0; i < dims; i++) userVector[i] += weight * vec[i];
        totalWeight += Math.abs(weight);
    }

    for (const c of userComments) {
        const score = SENTIMENT_SCORE[c.sentiment] ?? 0;
        const vec = articleVectors[c.article_id];
        if (!vec) continue;
        for (let i = 0; i < dims; i++) userVector[i] += score * vec[i];
        totalWeight += Math.abs(score);
    }

    if (totalWeight > 0) {
        for (let i = 0; i < dims; i++) userVector[i] /= totalWeight;
    }

    const candidates = articles
        .filter(a => !interactedIds.has(a.id))
        .map(a => ({
            ...a,
            score: cosineSimilarity(userVector, articleVectors[a.id]),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    res.json(candidates);
});

module.exports = router;