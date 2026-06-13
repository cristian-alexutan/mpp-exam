import { useState, useEffect } from 'react'
import { apiFetch } from './api'

const STATUS_LABEL = { started: 'Început', pending: 'În așteptare', finished: 'Finalizat' }

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

      <div className="dashboard-table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
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
                <td className="dash-title">{a.title}</td>
                <td><span className={`editor-status-badge status-${a.status}`}>{STATUS_LABEL[a.status]}</span></td>
                <td className="col-num like-color">{a.likes}</td>
                <td className="col-num dislike-color">{a.dislikes}</td>
                <td className="col-num">{a.likes + a.dislikes}</td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>Nicio reacție înregistrată.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
