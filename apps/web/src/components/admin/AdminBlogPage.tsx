'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { createPortal } from 'react-dom'
import {
  Plus, ChevronLeft, X, Check, Edit3, Trash2, Eye, EyeOff,
  FileText, Upload, Image as ImageIcon, RotateCw, Search,
  Tag, Calendar, BarChart3, ArrowRight, ChevronDown, ChevronUp,
  ExternalLink, Newspaper,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

type PostStatus = 'draft' | 'published' | 'archived'
type StatusFilter = 'all' | PostStatus
type View = 'grid' | 'editor'

interface Post {
  id: string
  title: string
  slug: string
  status: PostStatus
  excerpt: string | null
  content: string | null
  coverImageUrl: string | null
  categoryName: string | null
  categorySlug: string | null
  tags: string[]
  readingTimeMinutes: number
  viewCount: number
  publishedAt: string | null
  createdAt: string
  authorName: string | null
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
  postCount?: number
}

function useIsMobile(bp = 760) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    setM(mq.matches)
    const h = (e: MediaQueryListEvent) => setM(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [bp])
  return m
}

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }: { status: PostStatus }) {
  const colors: Record<PostStatus, { bg: string; tx: string }> = {
    published: { bg: 'rgba(127,200,147,0.15)', tx: '#7FC893' },
    draft: { bg: 'rgba(216,184,150,0.15)', tx: '#D8B896' },
    archived: { bg: 'rgba(176,144,112,0.15)', tx: '#B09070' },
  }
  const c = colors[status]
  return (
    <span className="adm-blog-badge" style={{ background: c.bg, color: c.tx }}>
      {status}
    </span>
  )
}

// TipTap toolbar
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, label: string, children: React.ReactNode) => (
    <button
      type="button"
      className={`adm-blog-tbtn${active ? ' active' : ''}`}
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  )

  return (
    <div className="adm-blog-toolbar">
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Heading 2', 'H2')}
      {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Heading 3', 'H3')}
      <span className="adm-blog-tdiv" />
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold', <strong>B</strong>)}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic', <em>I</em>)}
      {btn(editor.isActive('link'), () => {
        if (editor.isActive('link')) {
          editor.chain().focus().unsetLink().run()
        } else {
          const url = prompt('Enter URL:')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }
      }, 'Link', <span style={{ textDecoration: 'underline' }}>Lk</span>)}
      <span className="adm-blog-tdiv" />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Bullet list', <span style={{ fontSize: 11 }}>&#8226;</span>)}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Ordered list', '1.')}
      {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Blockquote', <span style={{ fontSize: 14 }}>&ldquo;</span>)}
      {btn(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), 'Code', <code style={{ fontSize: 11 }}>&lt;/&gt;</code>)}
      <span className="adm-blog-tdiv" />
      {btn(false, () => {
        const url = prompt('Enter image URL:')
        if (url) editor.chain().focus().setImage({ src: url }).run()
      }, 'Image', <ImageIcon size={14} />)}
      {btn(false, () => editor.chain().focus().setHorizontalRule().run(), 'Divider', <span style={{ fontSize: 11 }}>---</span>)}
    </div>
  )
}

// Cover image upload
function CoverUpload({ url, onUpload, onRemove }: {
  url: string | null
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return
    if (file.size > 5 * 1024 * 1024) return
    setUploading(true)
    onUpload(file)
    setUploading(false)
  }

  if (url) {
    return (
      <div className="adm-blog-cover-preview">
        <img src={url} alt="Cover" />
        <button type="button" className="adm-blog-cover-rm" onClick={onRemove} title="Remove cover">
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`adm-blog-cover-drop${dragOver ? ' over' : ''}`}
      onClick={() => !uploading && ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFile(f)
      }}
    >
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
      {uploading ? (
        <RotateCw size={20} className="adm-spin" />
      ) : (
        <>
          <Upload size={20} style={{ opacity: 0.5 }} />
          <span>Drop cover image here or click to upload</span>
          <span className="adm-blog-cover-hint">JPEG, PNG or WebP, max 5MB (optional)</span>
        </>
      )}
    </div>
  )
}

// Tags input (chips)
function TagsInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')

  function add() {
    const t = input.trim().toLowerCase()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  return (
    <div className="adm-blog-tags">
      {tags.map(t => (
        <span key={t} className="adm-blog-tag">
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))}><X size={12} /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        placeholder={tags.length === 0 ? 'Add tags...' : ''}
        className="adm-blog-tag-inp"
      />
    </div>
  )
}

// Blog post editor view
function PostEditor({ post, categories, onBack }: {
  post: Post | null
  categories: Category[]
  onBack: () => void
}) {
  const qc = useQueryClient()
  const isNew = !post

  const [title, setTitle] = useState(post?.title || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [coverUrl, setCoverUrl] = useState(post?.coverImageUrl || '')
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState<string[]>((post?.tags || []) as string[])
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDesc, setMetaDesc] = useState('')
  const [seoOpen, setSeoOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Find current category id from name
  useEffect(() => {
    if (post?.categoryName) {
      const cat = categories.find(c => c.name === post.categoryName)
      if (cat) setCategoryId(cat.id)
    }
  }, [post, categories])

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage,
      TiptapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing your post...' }),
    ],
    content: post?.content || '',
    editorProps: {
      attributes: {
        class: 'adm-blog-editor-content',
      },
    },
  })

  async function uploadCover(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post<{ data: { url: string } }>('/api/v1/blog/admin/upload-cover', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setCoverUrl(res.data.data.url)
    } catch {
      setError('Failed to upload cover image.')
    }
  }

  async function save(status?: PostStatus) {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError('')

    const content = editor?.getHTML() || ''
    const payload: Record<string, unknown> = {
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      content: content || null,
      coverImageUrl: coverUrl || null,
      categoryId: categoryId || null,
      tags,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDesc.trim() || null,
    }
    if (status) payload.status = status

    try {
      if (isNew) {
        if (status) payload.status = status
        await api.post('/api/v1/blog/admin', payload)
      } else {
        await api.patch(`/api/v1/blog/admin/${post.id}`, payload)
      }
      qc.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      onBack()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save post.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-blog-editor">
      <div className="adm-blog-editor-top">
        <button className="adm-btn adm-btn-ghost" onClick={onBack}>
          <ChevronLeft size={16} /> Back
        </button>
        <div className="adm-blog-editor-actions">
          <button className="adm-btn adm-btn-ghost" onClick={() => save('draft')} disabled={saving}>
            Save draft
          </button>
          <button className="adm-btn adm-blog-btn-pub" onClick={() => save('published')} disabled={saving}>
            {saving ? <RotateCw size={14} className="adm-spin" /> : <Check size={14} />}
            Publish
          </button>
        </div>
      </div>

      {error && <div className="adm-blog-error">{error}</div>}

      <div className="adm-blog-editor-layout">
        <div className="adm-blog-editor-main">
          <input
            className="adm-blog-title-inp"
            placeholder="Post title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <CoverUpload
            url={coverUrl || null}
            onUpload={uploadCover}
            onRemove={() => setCoverUrl('')}
          />

          <EditorToolbar editor={editor} />
          <div className="adm-blog-editor-wrap">
            <EditorContent editor={editor} />
          </div>
        </div>

        <div className="adm-blog-editor-side">
          <div className="adm-blog-side-section">
            <label className="adm-blog-side-label">Category</label>
            <select
              className="adm-blog-sel"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="">Uncategorized</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="adm-blog-side-section">
            <label className="adm-blog-side-label">Tags</label>
            <TagsInput tags={tags} onChange={setTags} />
          </div>

          <div className="adm-blog-side-section">
            <label className="adm-blog-side-label">Excerpt</label>
            <textarea
              className="adm-blog-ta"
              rows={3}
              placeholder="Brief summary for cards and SEO..."
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
            />
          </div>

          <div className="adm-blog-side-section">
            <button
              type="button"
              className="adm-blog-seo-toggle"
              onClick={() => setSeoOpen(!seoOpen)}
            >
              SEO settings
              {seoOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {seoOpen && (
              <div className="adm-blog-seo-fields">
                <div>
                  <label className="adm-blog-side-sublabel">
                    Meta title <span className="adm-blog-charcount">{metaTitle.length}/200</span>
                  </label>
                  <input
                    className="adm-blog-inp"
                    value={metaTitle}
                    onChange={e => setMetaTitle(e.target.value.slice(0, 200))}
                    placeholder="SEO title override"
                  />
                </div>
                <div>
                  <label className="adm-blog-side-sublabel">
                    Meta description <span className="adm-blog-charcount">{metaDesc.length}/500</span>
                  </label>
                  <textarea
                    className="adm-blog-ta"
                    rows={2}
                    value={metaDesc}
                    onChange={e => setMetaDesc(e.target.value.slice(0, 500))}
                    placeholder="SEO description override"
                  />
                </div>
              </div>
            )}
          </div>

          {post && (
            <div className="adm-blog-side-section adm-blog-side-info">
              <div>Status: <StatusBadge status={post.status} /></div>
              <div>Views: {post.viewCount.toLocaleString()}</div>
              <div>Reading time: {post.readingTimeMinutes} min</div>
              <div>Created: {formatDate(post.createdAt)}</div>
              {post.publishedAt && <div>Published: {formatDate(post.publishedAt)}</div>}
              <a href={`/blog/${post.slug}`} target="_blank" rel="noopener" className="adm-blog-preview-link">
                <ExternalLink size={12} /> View live
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Delete confirmation modal
function DeleteModal({ post, onClose, onConfirm }: {
  post: Post | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!post) return null
  return createPortal(
    <div className="adm-blog-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="adm-blog-modal">
        <div className="adm-blog-modal-ico"><Trash2 size={24} /></div>
        <h3>Delete this post?</h3>
        <p>This will permanently delete &ldquo;{post.title}&rdquo;. This action cannot be undone.</p>
        <div className="adm-blog-modal-actions">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn-danger" onClick={onConfirm}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function BlogSkeleton() {
  return (
    <div className="adm-blog-wrap">
      <div className="adm-blog-head">
        <div className="adm-skel" style={{ width: 120, height: 28 }} />
        <div className="adm-skel" style={{ width: 100, height: 36, borderRadius: 8 }} />
      </div>
      <div className="adm-blog-body">
        <div className="adm-blog-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="adm-blog-card">
              <div className="adm-skel" style={{ height: 140, borderRadius: '8px 8px 0 0' }} />
              <div style={{ padding: 16 }}>
                <div className="adm-skel" style={{ width: '70%', height: 16, marginBottom: 8 }} />
                <div className="adm-skel" style={{ width: '90%', height: 12, marginBottom: 4 }} />
                <div className="adm-skel" style={{ width: '50%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AdminBlogPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<View>('grid')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['admin-blog-posts', filter, search],
    queryFn: () => {
      const params: Record<string, string> = { limit: '100' }
      if (filter !== 'all') params.status = filter
      if (search) params.search = search
      return api.get('/api/v1/blog/admin/all', { params }).then(r => r.data)
    },
  })

  const { data: catsData } = useQuery({
    queryKey: ['admin-blog-categories'],
    queryFn: () => api.get('/api/v1/blog/admin/categories').then(r => r.data),
  })

  const posts: Post[] = postsData?.data ?? []
  const categories: Category[] = catsData?.data ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/blog/admin/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      setDeleteId(null)
    },
  })

  if (postsLoading) return <BlogSkeleton />

  if (view === 'editor') {
    const editPost = editId ? posts.find(p => p.id === editId) || null : null
    return (
      <PostEditor
        post={editPost}
        categories={categories}
        onBack={() => { setView('grid'); setEditId(null) }}
      />
    )
  }

  const counts = {
    all: posts.length,
    draft: posts.filter(p => p.status === 'draft').length,
    published: posts.filter(p => p.status === 'published').length,
    archived: posts.filter(p => p.status === 'archived').length,
  }

  return (
    <div className="adm-blog-wrap">
      <div className="adm-blog-head">
        <h1>Blog</h1>
        <button className="adm-btn adm-blog-btn-pub" onClick={() => { setEditId(null); setView('editor') }}>
          <Plus size={16} /> New post
        </button>
      </div>

      <div className="adm-blog-body">
        <div className="adm-blog-controls">
          <div className="adm-blog-tabs">
            {(['all', 'published', 'draft', 'archived'] as StatusFilter[]).map(f => (
              <button
                key={f}
                className={`adm-blog-tab${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="adm-blog-tab-count">{counts[f]}</span>
              </button>
            ))}
          </div>
          <div className="adm-blog-search">
            <Search size={15} />
            <input
              placeholder="Search posts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="adm-blog-empty">
            <FileText size={40} style={{ opacity: 0.3 }} />
            <p>{filter === 'all' ? 'No posts yet. Create your first blog post.' : `No ${filter} posts.`}</p>
          </div>
        ) : (
          <div className="adm-blog-grid">
            {posts.map(post => (
              <div key={post.id} className="adm-blog-card" onClick={() => { setEditId(post.id); setView('editor') }}>
                {post.coverImageUrl ? (
                  <img className="adm-blog-card-img" src={post.coverImageUrl} alt="" />
                ) : (
                  <div className="adm-blog-card-noimg">
                    <FileText size={24} style={{ opacity: 0.3 }} />
                  </div>
                )}
                <div className="adm-blog-card-body">
                  <div className="adm-blog-card-top">
                    <StatusBadge status={post.status} />
                    {post.categoryName && <span className="adm-blog-card-cat">{post.categoryName}</span>}
                  </div>
                  <h3 className="adm-blog-card-title">{post.title}</h3>
                  {post.excerpt && <p className="adm-blog-card-excerpt">{post.excerpt}</p>}
                  <div className="adm-blog-card-meta">
                    <span><Eye size={12} /> {post.viewCount}</span>
                    <span><Calendar size={12} /> {formatDate(post.publishedAt || post.createdAt)}</span>
                  </div>
                </div>
                <div className="adm-blog-card-actions" onClick={e => e.stopPropagation()}>
                  <button title="Edit" onClick={() => { setEditId(post.id); setView('editor') }}><Edit3 size={14} /></button>
                  <button title="Delete" className="danger" onClick={() => setDeleteId(post.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteModal
        post={deleteId ? posts.find(p => p.id === deleteId) || null : null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId) }}
      />
    </div>
  )
}
