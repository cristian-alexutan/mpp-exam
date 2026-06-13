import { useState, useEffect } from 'react'
import { apiFetch } from './api'

const STATUS_LABEL = { started: 'Început', pending: 'În așteptare', finished: 'Finalizat' }

// R = 15.9155 gives circumference ≈ 100, so percentages map directly to dash lengths
const R = 15.9155
const C = 100

function DonutChart({ likes, dislikes, size = 48, strokeWidth = 7 }) {
  const total = likes + dislikes

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={R} fill="none" stroke="#1e1e1e" strokeWidth={strokeWidth} />
        <text x="20" y="24" textAnchor="middle" fontSize="7" fill="#444" fontFamily="monospace">—</text>
      </svg>
    )
  }

  const likeArc = (likes / total) * C
  const dislikeArc = C - likeArc

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="20" cy="20" r={R} fill="none" stroke="#1a1a1a" strokeWidth={strokeWidth} />
      <circle
        cx="20" cy="20" r={R} fill="none"
        stroke="rgba(80,170,255,0.85)" strokeWidth={strokeWidth}
        strokeDasharray={`${likeArc} ${dislikeArc}`}
        strokeLinecap="butt"
      />
      <circle
        cx="20" cy="20" r={R} fill="none"
        stroke="rgba(255,80,80,0.85)" strokeWidth={strokeWidth}
        strokeDasharray={`${dislikeArc} ${likeArc}`}
        strokeDashoffset={C - likeArc}
        strokeLinecap="butt"
      />
    </svg>
  )
}

function DonutChartLabelled({ likes, dislikes, size = 120, strokeWidth = 14 }) {
  const total = likes + dislikes
  return (
    <div className="donut-labelled">
      <div style={{ position: 'relative', width: size, height: size }}>
        <DonutChart likes={likes} dislikes={dislikes} size={size} strokeWidth={strokeWidth} />
        <div className="donut-center">
          <span className="donut-total">{total}</span>
          <span className="donut-total-label">total</span>
        </div>
      </div>
      <div className="donut-legend">
        <span className="legend-dot like-color">●</span>
        <span className="like-color">{likes}</span>
        <span className="legend-label">aprecieri</span>
        <span className="legend-dot dislike-color" style={{ marginLeft: 10 }}>●</span>
        <span className="dislike-color">{dislikes}</span>
        <span className="legend-label">dezaprobări</span>
      </div>
    </div>
  )
}

export default function Dashboard({ onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Eroare la încărcare statistici'); setLoading(false) })
  }, [])

  if (loading) return <div className="loading">Se încarcă...</div>
  if (error) return <div className="loading">{error}</div>

  const { articles, totals } = data

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard Admin</h2>
        <button className="editor-btn secondary" onClick={onBack}>Înapoi la ziar</button>
      </div>

      <div className="dashboard-summary">
        <DonutChartLabelled likes={totals.totalLikes} dislikes={totals.totalDislikes} />
        <div className="dashboard-totals">
          <div className="dash-stat">
            <span className="dash-stat-value like-color">{totals.totalLikes}</span>
            <span className="dash-stat-label">Total aprecieri</span>
          </div>
          <div className="dash-stat">
            <span className="dash-stat-value dislike-color">{totals.totalDislikes}</span>
            <span className="dash-stat-label">Total dezaprobări</span>
          </div>
          <div className="dash-stat">
            <span className="dash-stat-value">{totals.uniqueVoters}</span>
            <span className="dash-stat-label">Utilizatori activi</span>
          </div>
        </div>
      </div>

      <div className="dashboard-table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th></th>
              <th>Articol</th>
              <th>Status</th>
              <th className="col-num like-color">👍</th>
              <th className="col-num dislike-color">👎</th>
              <th className="col-num">Total</th>
            </tr>
          </thead>
          <tbody>
            {articles.map(a => (
              <tr key={a.id}>
                <td className="col-chart">
                  <DonutChart likes={a.likes} dislikes={a.dislikes} size={40} strokeWidth={6} />
                </td>
                <td className="dash-title">{a.title}</td>
                <td><span className={`editor-status-badge status-${a.status}`}>{STATUS_LABEL[a.status]}</span></td>
                <td className="col-num like-color">{a.likes}</td>
                <td className="col-num dislike-color">{a.dislikes}</td>
                <td className="col-num">{a.likes + a.dislikes}</td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>Nicio reacție înregistrată.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
