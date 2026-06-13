import { useState, useEffect } from 'react'
import { apiFetch } from './api'

const STATUSES = ['started', 'pending', 'finished']

function ImageList({ images, paragraphId, onDelete }) {
  return (
    <div className="image-list">
      {images.map(img => (
        <div key={img.id} className="image-item">
          <img src={`/uploads/${img.path}`} alt="" className="thumb" />
          <button className="img-delete-btn" onClick={() => onDelete(paragraphId, img.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

function ParagraphRow({ para, articleId, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(para.text)
  const [textError, setTextError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function saveText() {
    if (!text.trim()) { setTextError('Textul nu poate fi gol'); return; }
    setTextError('')
    const res = await apiFetch(`/api/paragraphs/${para.id}`, { method: 'PUT', body: { text } })
    if (res.ok) { onUpdate(para.id, text); setEditing(false) }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Selectați un fișier imagine'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Imaginea trebuie să fie sub 5MB'); return }

    setUploading(true)
    const fd = new FormData()
    fd.append('image', file)
    const res = await apiFetch(`/api/paragraphs/${para.id}/images`, { method: 'POST', body: fd })
    if (res.ok) {
      const img = await res.json()
      onUpdate(para.id, null, [...para.images, img])
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleDeleteImage(paragraphId, imageId) {
    if (!confirm('Ștergeți imaginea?')) return
    const res = await apiFetch(`/api/images/${imageId}`, { method: 'DELETE' })
    if (res.ok) onUpdate(para.id, null, para.images.filter(i => i.id !== imageId))
  }

  return (
    <div className="para-row">
      <div className="para-header">
        <span className="para-index">§ {para.order_index + 1}</span>
        <div className="para-actions">
          {!editing && <button className="para-btn" onClick={() => setEditing(true)}>Editează</button>}
          <button className="para-btn danger" onClick={() => onDelete(para.id)}>Șterge</button>
        </div>
      </div>

      {editing ? (
        <div className="para-edit">
          <textarea
            className="para-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
          />
          {textError && <p className="field-error">{textError}</p>}
          <div className="para-edit-actions">
            <button className="editor-btn" onClick={saveText}>Salvează</button>
            <button className="editor-btn secondary" onClick={() => { setEditing(false); setText(para.text); setTextError('') }}>Anulează</button>
          </div>
        </div>
      ) : (
        <p className="para-preview">{para.text}</p>
      )}

      <ImageList images={para.images} paragraphId={para.id} onDelete={handleDeleteImage} />

      <label className="img-upload-label">
        {uploading ? 'Se încarcă...' : '+ Adaugă imagine'}
        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ display: 'none' }} />
      </label>
    </div>
  )
}

export default function ArticleEditor({ articleId: initialId, onBack }) {
  const [article, setArticle] = useState(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [titleError, setTitleError] = useState('')
  const [dateError, setDateError] = useState('')
  const [newParaText, setNewParaText] = useState('')
  const [newParaError, setNewParaError] = useState('')
  const [journalists, setJournalists] = useState([])
  const [saving, setSaving] = useState(false)

  const isNew = !initialId

  useEffect(() => {
    apiFetch('/api/users/journalists').then(r => r.json()).then(setJournalists)
    if (!isNew) {
      apiFetch(`/api/articles/${initialId}`).then(r => r.json()).then(a => {
        setArticle(a)
        setTitle(a.title)
        setDate(a.date)
      })
    } else {
      setArticle(null)
    }
  }, [initialId])

  function validateHeader() {
    let ok = true
    if (!title.trim()) { setTitleError('Titlul este obligatoriu'); ok = false } else setTitleError('')
    if (title.trim().length > 200) { setTitleError('Titlul trebuie să aibă sub 200 de caractere'); ok = false }
    if (!date.trim()) { setDateError('Data este obligatorie'); ok = false } else setDateError('')
    return ok
  }

  async function createArticle() {
    if (!validateHeader()) return
    setSaving(true)
    const res = await apiFetch('/api/articles', { method: 'POST', body: { title, date } })
    const data = await res.json()
    if (!res.ok) { setTitleError(data.error); setSaving(false); return }
    setArticle(data)
    setSaving(false)
  }

  async function saveHeader() {
    if (!validateHeader()) return
    setSaving(true)
    const res = await apiFetch(`/api/articles/${article.id}`, { method: 'PUT', body: { title, date } })
    if (res.ok) setArticle(a => ({ ...a, title, date }))
    setSaving(false)
  }

  async function changeStatus(status) {
    const res = await apiFetch(`/api/articles/${article.id}/status`, { method: 'PATCH', body: { status } })
    if (res.ok) setArticle(a => ({ ...a, status }))
  }

  async function toggleJournalist(jid) {
    const current = article.journalists.map(j => j.id)
    const next = current.includes(jid) ? current.filter(id => id !== jid) : [...current, jid]
    const res = await apiFetch(`/api/articles/${article.id}/journalists`, {
      method: 'PUT', body: { journalistIds: next }
    })
    if (res.ok) setArticle(a => ({
      ...a,
      journalists: next.map(id => journalists.find(j => j.id === id)).filter(Boolean)
    }))
  }

  async function addParagraph() {
    if (!newParaText.trim()) { setNewParaError('Textul paragrafului este obligatoriu'); return }
    setNewParaError('')
    const res = await apiFetch(`/api/articles/${article.id}/paragraphs`, {
      method: 'POST', body: { text: newParaText }
    })
    if (res.ok) {
      const para = await res.json()
      setArticle(a => ({ ...a, paragraphs: [...a.paragraphs, para] }))
      setNewParaText('')
    }
  }

  function updateParagraph(paraId, newText, newImages) {
    setArticle(a => ({
      ...a,
      paragraphs: a.paragraphs.map(p => p.id === paraId
        ? { ...p, ...(newText !== null ? { text: newText } : {}), ...(newImages !== undefined ? { images: newImages } : {}) }
        : p
      )
    }))
  }

  async function deleteParagraph(paraId) {
    if (!confirm('Ștergeți paragraful și imaginile sale?')) return
    const res = await apiFetch(`/api/paragraphs/${paraId}`, { method: 'DELETE' })
    if (res.ok) setArticle(a => ({ ...a, paragraphs: a.paragraphs.filter(p => p.id !== paraId) }))
  }

  return (
    <div className="article-editor">
      <button className="back-btn" onClick={onBack}>← Înapoi la articole</button>

      <div className="editor-section">
        <h3 className="editor-section-title">{isNew && !article ? 'Articol nou' : 'Detalii articol'}</h3>
        <div className="editor-field">
          <label className="editor-label">Titlu</label>
          <input className="editor-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titlul articolului" />
          {titleError && <p className="field-error">{titleError}</p>}
        </div>
        <div className="editor-field">
          <label className="editor-label">Data</label>
          <input className="editor-input" value={date} onChange={e => setDate(e.target.value)} placeholder="ex: 12 Iunie 2026" />
          {dateError && <p className="field-error">{dateError}</p>}
        </div>

        {!article ? (
          <button className="editor-btn" onClick={createArticle} disabled={saving}>
            {saving ? 'Se creează...' : 'Creează articol'}
          </button>
        ) : (
          <button className="editor-btn" onClick={saveHeader} disabled={saving}>
            {saving ? 'Se salvează...' : 'Salvează'}
          </button>
        )}
      </div>

      {article && (
        <>
          <div className="editor-section">
            <h3 className="editor-section-title">Status</h3>
            <div className="status-row">
              {['started', 'pending', 'finished'].map(s => (
                <button
                  key={s}
                  className={`status-btn ${article.status === s ? 'active' : ''} status-${s}`}
                  onClick={() => changeStatus(s)}
                >
                  {s === 'started' ? 'Început' : s === 'pending' ? 'În așteptare' : 'Finalizat'}
                </button>
              ))}
            </div>
          </div>

          {journalists.length > 0 && (
            <div className="editor-section">
              <h3 className="editor-section-title">Jurnaliști asignați</h3>
              <div className="journalist-list">
                {journalists.map(j => (
                  <label key={j.id} className="journalist-check">
                    <input
                      type="checkbox"
                      checked={article.journalists.some(aj => aj.id === j.id)}
                      onChange={() => toggleJournalist(j.id)}
                    />
                    {j.username}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="editor-section">
            <h3 className="editor-section-title">Paragrafe</h3>
            {article.paragraphs.map(para => (
              <ParagraphRow
                key={para.id}
                para={para}
                articleId={article.id}
                onUpdate={updateParagraph}
                onDelete={deleteParagraph}
              />
            ))}
            <div className="new-para">
              <textarea
                className="para-textarea"
                placeholder="Text paragraf nou..."
                value={newParaText}
                onChange={e => setNewParaText(e.target.value)}
                rows={3}
              />
              {newParaError && <p className="field-error">{newParaError}</p>}
              <button className="editor-btn" onClick={addParagraph}>+ Adaugă paragraf</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
