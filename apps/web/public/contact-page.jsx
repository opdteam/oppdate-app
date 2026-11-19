/* Contact page inquiry form — extracted from company-page.jsx.
   Registered to window.OMCQ for the mount script. */
(function () {
  const { Eyebrow, Icon, Button } = window.OppDateDesignSystem_4aa598;

  const CATEGORY_OPTIONS = [
    { value: 'careers', label: 'Careers' },
    { value: 'get-featured', label: 'Get Featured' },
    { value: 'partner-with-us', label: 'Partner With Us' },
    { value: 'become-a-consultant', label: 'Become a Consultant' },
    { value: 'become-a-mentor', label: 'Become a Mentor' },
    { value: 'list-your-ebook', label: 'List Your eBook' },
    { value: 'general', label: 'General Inquiry' },
  ];

  const CATEGORY_ICONS = {
    'careers': 'briefcase',
    'get-featured': 'star',
    'partner-with-us': 'handshake',
    'become-a-consultant': 'graduation-cap',
    'become-a-mentor': 'heart-handshake',
    'list-your-ebook': 'book-open',
    'general': 'message-circle',
  };

  function InquirySection({ selectedCategory }) {
    const [category, setCategory] = React.useState(selectedCategory || '');
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [file, setFile] = React.useState(null);
    const [status, setStatus] = React.useState('idle');
    const [errorMsg, setErrorMsg] = React.useState('');
    const [dragOver, setDragOver] = React.useState(false);
    const [catFlash, setCatFlash] = React.useState(false);
    const fileRef = React.useRef(null);
    const formRef = React.useRef(null);
    const charCount = message.length;

    React.useEffect(() => {
      if (selectedCategory && selectedCategory !== category) {
        setCategory(selectedCategory);
        setCatFlash(true);
        const t = setTimeout(() => setCatFlash(false), 800);
        return () => clearTimeout(t);
      }
    }, [selectedCategory]);

    const handleFile = (f) => {
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) { setErrorMsg('File exceeds 10MB limit.'); return; }
      const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!allowed.includes(f.type)) { setErrorMsg('File type not allowed. Use PDF, DOCX, JPG, or PNG.'); return; }
      setFile(f);
      setErrorMsg('');
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!category || !name.trim() || !email.trim() || !message.trim()) { setErrorMsg('Please fill in all required fields.'); return; }
      setStatus('loading');
      setErrorMsg('');
      const fd = new FormData();
      fd.append('category', category);
      fd.append('name', name.trim());
      fd.append('email', email.trim());
      fd.append('message', message.trim());
      if (file) fd.append('file', file);
      try {
        const apiBase = window.__apiBase || '';
        const res = await fetch(apiBase + '/api/v1/inquiries', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) { setStatus('success'); setName(''); setEmail(''); setMessage(''); setFile(null); if (fileRef.current) fileRef.current.value = ''; }
        else { setErrorMsg(data.error || 'Something went wrong. Please try again.'); setStatus('idle'); }
      } catch { setErrorMsg('Network error. Please check your connection and try again.'); setStatus('idle'); }
    };

    const removeFile = () => { setFile(null); if (fileRef.current) fileRef.current.value = ''; };

    if (status === 'success') {
      return (
        <section id="inquiry" className="co-inquiry-section" style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.028, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px', pointerEvents: 'none', zIndex: 0 }} />
          <div className="wrap" style={{ padding: '80px var(--container-pad)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <span className="co-success-check" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 'var(--radius-pill)', background: 'var(--action)', color: 'var(--color-text-inverse)', marginBottom: 20 }}>
              <Icon name="check" size={28} />
            </span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-split-size, 40px)', fontWeight: 700, lineHeight: 1.08, color: 'var(--color-text-ink)', margin: 0 }}>Inquiry submitted.</h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size, 18px)', lineHeight: 1.6, color: 'var(--text-body)', maxWidth: '46ch', margin: '14px auto 0' }}>
              Thank you for reaching out. Our team will review your inquiry and get back to you within 24-48 hours.
            </p>
            <div style={{ marginTop: 28 }}>
              <Button as="button" variant="secondary-on-light" size="lg" onClick={() => setStatus('idle')}>
                Send another inquiry
              </Button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section id="inquiry" className="co-inquiry-section" style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.028, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px', pointerEvents: 'none', zIndex: 0 }} />
        <div className="wrap" style={{ padding: '80px var(--container-pad)', position: 'relative', zIndex: 1 }}>
          <div className="co-inquiry-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 40%) minmax(0, 60%)', gap: 56, alignItems: 'start' }}>
            <div className="co-inquiry-sticky">
              <div aria-hidden="true" className="co-inquiry-accent" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2, background: 'linear-gradient(180deg, var(--action) 0%, var(--decor-numeral) 100%)', opacity: 0.6 }} />
              <div className="co-inquiry-left" style={{ paddingLeft: 24 }}>
                <Eyebrow style={{ marginBottom: 16 }}>Get in touch</Eyebrow>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-split-size, 40px)', fontWeight: 700, lineHeight: 1.08, color: 'var(--color-text-ink)', maxWidth: '18ch', margin: 0 }}>
                  Start a conversation.
                </h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.55, color: 'var(--text-body)', maxWidth: '36ch', marginTop: 18 }}>
                  Choose a category, tell us about yourself, and we will route your inquiry to the right person on our team.
                </p>

              </div>
            </div>

            <div className="co-inquiry-card">
            <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
              {/* Category pills */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)', marginBottom: 10, letterSpacing: '0.01em' }}>
                  What can we help with? <span style={{ color: 'var(--action)' }}>*</span>
                </label>
                <div className="co-cat-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORY_OPTIONS.map((o) => {
                    const active = category === o.value;
                    const flashing = catFlash && active;
                    return (
                      <button key={o.value} type="button" className={'co-cat-pill' + (active ? ' active' : '') + (flashing ? ' flash' : '')} onClick={() => setCategory(o.value)}>
                        <Icon name={CATEGORY_ICONS[o.value]} size={14} />
                        <span>{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name + Email */}
              <div className="co-name-email" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)', marginBottom: 6 }}>Full name <span style={{ color: 'var(--action)' }}>*</span></label>
                  <input type="text" className="co-inquiry-input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)', marginBottom: 6 }}>Email <span style={{ color: 'var(--action)' }}>*</span></label>
                  <input type="email" className="co-inquiry-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              {/* Message with counter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <label style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)' }}>Message <span style={{ color: 'var(--action)' }}>*</span></label>
                  {charCount > 400 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: charCount > 800 ? 'var(--action)' : 'var(--text-quiet)' }}>{charCount}/5000</span>}
                </div>
                <textarea className="co-inquiry-textarea" placeholder="Tell us what you are looking for..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} required />
              </div>

              {/* File upload with drag-and-drop */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)', marginBottom: 6 }}>
                  Attachment <span style={{ color: 'var(--text-quiet)', fontWeight: 400 }}>(optional)</span>
                </label>
                {file ? (
                  <div className="co-file-label has-file">
                    <Icon name="file-text" size={18} style={{ color: 'var(--action)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-quiet)', flexShrink: 0 }}>{(file.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={removeFile} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 'var(--radius-pill)', border: 'none', background: 'rgba(194,65,12,0.1)', color: 'var(--action)', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ) : (
                  <label
                    className={'co-file-label' + (dragOver ? ' co-file-drag' : '')}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Icon name="upload" size={18} style={{ color: dragOver ? 'var(--action)' : 'var(--text-quiet)', transition: 'color 150ms ease' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: dragOver ? 'var(--action)' : 'var(--text-body)', transition: 'color 150ms ease' }}>
                      {dragOver ? 'Drop your file here' : 'Upload CV, portfolio, or document'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-quiet)', marginLeft: 'auto' }}>PDF, DOCX, JPG, PNG (10MB max)</span>
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files && e.target.files[0])} />
                  </label>
                )}
              </div>

              {errorMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(178,58,42,0.06)', border: '1px solid rgba(178,58,42,0.18)' }}>
                  <Icon name="alert-circle" size={16} style={{ color: '#B23A2A', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#B23A2A' }}>{errorMsg}</span>
                </div>
              )}

              <div>
                <button type="submit" className={'co-submit-btn' + (status === 'loading' ? ' loading' : '')} disabled={status === 'loading'}>
                  {status === 'loading' ? (<><span className="co-spinner" />Submitting...</>) : 'Submit inquiry'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                  <Icon name="lock" size={13} style={{ color: 'var(--text-quiet)' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-quiet)', fontWeight: 400 }}>Your data is encrypted and secure</span>
                </div>
              </div>
            </form>
            </div>
          </div>
        </div>
      </section>
    );
  }

  window.OMCQ = { InquirySection };
})();
