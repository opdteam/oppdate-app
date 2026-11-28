(function () {
  const { Eyebrow, Icon, Button } = window.OppDateDesignSystem_4aa598;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  const API = window.__apiBase || '';

  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Skeleton card while loading
  function SkeletonCard() {
    return (
      <div className="blog-card" style={{ pointerEvents: 'none' }}>
        <div className="blog-skeleton" style={{ aspectRatio: '16/9' }} />
        <div className="blog-card-body">
          <div className="blog-skeleton" style={{ width: 60, height: 18, marginBottom: 10 }} />
          <div className="blog-skeleton" style={{ width: '90%', height: 20, marginBottom: 6 }} />
          <div className="blog-skeleton" style={{ width: '70%', height: 20, marginBottom: 12 }} />
          <div className="blog-skeleton" style={{ width: '100%', height: 14, marginBottom: 4 }} />
          <div className="blog-skeleton" style={{ width: '80%', height: 14, marginBottom: 16 }} />
          <div className="blog-skeleton" style={{ width: '50%', height: 12 }} />
        </div>
      </div>
    );
  }

  // Blog post card (dual layout: with/without cover)
  function BlogCard({ post, index }) {
    const ref = React.useRef(null);
    const [visible, setVisible] = React.useState(false);

    React.useEffect(() => {
      const el = ref.current;
      if (!el || REDUCED.matches) { setVisible(true); return; }
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
      }, { threshold: 0.1 });
      obs.observe(el);
      return () => obs.disconnect();
    }, []);

    const delay = (index % 6) * 80;

    return (
      <a
        ref={ref}
        href={'/blog/' + post.slug}
        className="blog-card"
        style={{
          opacity: visible ? 1 : 0,
          translate: visible ? '0 0' : '0 24px',
          transition: 'opacity 0.5s var(--ease-out-soft) ' + delay + 'ms, translate 0.5s var(--ease-out-soft) ' + delay + 'ms, box-shadow var(--duration-base) var(--ease-out-soft)',
        }}
      >
        {post.coverImageUrl ? (
          <img className="blog-card-img" src={post.coverImageUrl} alt={post.title} loading="lazy" />
        ) : (
          <div className="blog-card-no-img">
            <Icon name="file-text" size={32} style={{ color: 'var(--action)', opacity: 0.3 }} />
          </div>
        )}
        <div className="blog-card-body">
          {post.categoryName && <span className="blog-card-cat">{post.categoryName}</span>}
          <h3 className="blog-card-title">{post.title}</h3>
          <p className="blog-card-excerpt">{post.excerpt || ''}</p>
          <div className="blog-card-meta">
            <span>
              <Icon name="clock" size={13} />
              {post.readingTimeMinutes} min read
              <span style={{ margin: '0 6px', opacity: 0.4 }}>|</span>
              {formatDate(post.publishedAt)}
            </span>
            <span className="blog-card-read">
              Read more <Icon name="arrow-right" size={14} />
            </span>
          </div>
        </div>
      </a>
    );
  }

  // Hero section
  function BlogHero() {
    return (
      <section className="blog-hero">
        <Eyebrow>Blog</Eyebrow>
        <h1>Insights for the opportunity-driven</h1>
        <p>Guides, strategies, and expert advice to help you navigate scholarships, internships, and career opportunities around the world.</p>
      </section>
    );
  }

  // Category filter pills
  function BlogCategories({ categories, active, onChange }) {
    return (
      <div className="blog-cats">
        <button
          className={'blog-cat-pill' + (!active ? ' active' : '')}
          onClick={() => onChange(null)}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.slug}
            className={'blog-cat-pill' + (active === cat.slug ? ' active' : '')}
            onClick={() => onChange(cat.slug)}
          >
            {cat.name}
            {cat.postCount > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 11 }}>{cat.postCount}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Main blog listing
  function BlogListing() {
    const [posts, setPosts] = React.useState([]);
    const [categories, setCategories] = React.useState([]);
    const [activeCategory, setActiveCategory] = React.useState(null);
    const [page, setPage] = React.useState(1);
    const [hasMore, setHasMore] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [loadingMore, setLoadingMore] = React.useState(false);

    React.useEffect(() => {
      fetch(API + '/api/v1/blog/categories')
        .then(r => r.json())
        .then(d => { if (d.success) setCategories(d.data); })
        .catch(() => {});
    }, []);

    React.useEffect(() => {
      setLoading(true);
      setPage(1);
      const url = API + '/api/v1/blog?limit=12' + (activeCategory ? '&category=' + activeCategory : '');
      fetch(url)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setPosts(d.data);
            setHasMore(d.hasMore);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, [activeCategory]);

    function loadMore() {
      const nextPage = page + 1;
      setLoadingMore(true);
      const url = API + '/api/v1/blog?limit=12&page=' + nextPage + (activeCategory ? '&category=' + activeCategory : '');
      fetch(url)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setPosts(prev => [...prev, ...d.data]);
            setHasMore(d.hasMore);
            setPage(nextPage);
          }
          setLoadingMore(false);
        })
        .catch(() => setLoadingMore(false));
    }

    return (
      <>
        <BlogCategories categories={categories} active={activeCategory} onChange={setActiveCategory} />

        {loading ? (
          <div className="blog-grid">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="blog-empty">
            <Icon name="book-open" size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>No posts yet. Check back soon.</p>
          </div>
        ) : (
          <>
            <div className="blog-grid">
              {posts.map((post, i) => <BlogCard key={post.id} post={post} index={i} />)}
            </div>
            {hasMore && (
              <div className="blog-load-more">
                <Button variant="secondary" size="lg" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </>
    );
  }

  // Newsletter CTA section
  function BlogNewsletter() {
    const NS = window.OppDateDesignSystem_4aa598;
    return (
      <section className="blog-cta">
        <h2>Never miss an opportunity</h2>
        <p>Get the latest guides, scholarship tips, and career insights delivered to your inbox.</p>
        <NS.NewsletterForm />
      </section>
    );
  }

  window.OMBLOG = {
    BlogHero,
    BlogListing,
    BlogNewsletter,
  };
})();
