(function () {
  const { Icon } = window.OppDateDesignSystem_4aa598;
  const API = window.__apiBase || '';

  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Reading progress bar
  function ReadingProgress() {
    const [progress, setProgress] = React.useState(0);

    React.useEffect(() => {
      function update() {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0);
      }
      window.addEventListener('scroll', update, { passive: true });
      update();
      return () => window.removeEventListener('scroll', update);
    }, []);

    return <div className="blog-progress" style={{ width: progress + '%' }} />;
  }

  // Post header (dual layout)
  function PostHeader({ post }) {
    const hasCover = !!post.coverImageUrl;

    return (
      <header className={'blog-post-header' + (hasCover ? ' has-cover' : '')}>
        {hasCover && (
          <img className="blog-post-cover" src={post.coverImageUrl} alt={post.title} />
        )}

        {!hasCover && (
          <div className="blog-post-accent" />
        )}

        <a href="/blog" className="blog-post-back">
          <Icon name="arrow-left" size={14} />
          Back to blog
        </a>

        {post.categoryName && (
          <div className="blog-post-cat">{post.categoryName}</div>
        )}

        <h1 className="blog-post-title">{post.title}</h1>

        <div className="blog-post-meta">
          <span className="blog-post-author">
            {post.authorAvatarUrl ? (
              <img src={post.authorAvatarUrl} alt={post.authorName} />
            ) : (
              <span style={{
                width: 28, height: 28, borderRadius: '50%', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(122,45,5,0.1)', color: '#7a2d05',
                fontSize: 13, fontWeight: 600,
              }}>
                {(post.authorName || '?')[0]}
              </span>
            )}
            {post.authorName}
          </span>
          <span className="blog-post-meta-sep" />
          <span>{formatDate(post.publishedAt)}</span>
          <span className="blog-post-meta-sep" />
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="clock" size={14} />
            {post.readingTimeMinutes} min read
          </span>
        </div>
      </header>
    );
  }

  // Post body
  function PostBody({ content }) {
    return (
      <article className="blog-prose" dangerouslySetInnerHTML={{ __html: content || '' }} />
    );
  }

  // Related posts grid
  function RelatedPosts({ posts }) {
    if (!posts || posts.length === 0) return null;

    return (
      <section className="blog-related">
        <h2>Related posts</h2>
        <div className="blog-related-grid">
          {posts.map(post => (
            <a key={post.id} href={'/blog/' + post.slug} className="blog-related-card">
              {post.coverImageUrl ? (
                <img src={post.coverImageUrl} alt={post.title} loading="lazy" />
              ) : (
                <div style={{
                  aspectRatio: '16/9', background: 'linear-gradient(135deg,#fdf7f2,#f5ebe0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '3px solid var(--action)',
                }}>
                  <Icon name="file-text" size={28} style={{ color: 'var(--action)', opacity: 0.3 }} />
                </div>
              )}
              <div className="blog-related-card-body">
                <h3 className="blog-related-card-title">{post.title}</h3>
                <div className="blog-related-card-meta">
                  {post.readingTimeMinutes} min read
                  {post.categoryName && <> | {post.categoryName}</>}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    );
  }

  // Newsletter CTA
  function PostNewsletter() {
    const NS = window.OppDateDesignSystem_4aa598;
    return (
      <section className="blog-cta">
        <h2>Enjoyed this article?</h2>
        <p>Subscribe to get more insights on scholarships, career tips, and opportunities delivered to your inbox.</p>
        <NS.NewsletterForm />
      </section>
    );
  }

  // Main blog post view
  function BlogPostView() {
    const [post, setPost] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);

    React.useEffect(() => {
      const slug = window.__BLOG_SLUG;
      if (!slug) { setError(true); setLoading(false); return; }

      fetch(API + '/api/v1/blog/' + slug)
        .then(r => r.json())
        .then(d => {
          if (d.success) setPost(d.data);
          else setError(true);
          setLoading(false);
        })
        .catch(() => { setError(true); setLoading(false); });
    }, []);

    if (loading) {
      return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '100px 24px' }}>
          <div className="blog-skeleton" style={{ width: 80, height: 20, marginBottom: 16 }} />
          <div className="blog-skeleton" style={{ width: '80%', height: 36, marginBottom: 10 }} />
          <div className="blog-skeleton" style={{ width: '50%', height: 36, marginBottom: 24 }} />
          <div className="blog-skeleton" style={{ width: '40%', height: 16, marginBottom: 48 }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="blog-skeleton" style={{ width: (70 + Math.random() * 30) + '%', height: 16, marginBottom: 12 }} />
          ))}
        </div>
      );
    }

    if (error || !post) {
      return (
        <div style={{ textAlign: 'center', padding: '120px 24px', fontFamily: 'var(--font-sans)' }}>
          <Icon name="file-x" size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 16 }} />
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-heading)', margin: '0 0 8px' }}>Post not found</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 24px' }}>This post may have been removed or the link is incorrect.</p>
          <a href="/blog" style={{ color: 'var(--action)', fontWeight: 500, textDecoration: 'none' }}>
            <Icon name="arrow-left" size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
            Back to blog
          </a>
        </div>
      );
    }

    return (
      <>
        <ReadingProgress />
        <PostHeader post={post} />
        <PostBody content={post.content} />
        <div className="blog-post-sep"><div /></div>
        <RelatedPosts posts={post.related} />
        <PostNewsletter />
      </>
    );
  }

  window.OMBLOGPOST = {
    BlogPostView,
  };
})();
