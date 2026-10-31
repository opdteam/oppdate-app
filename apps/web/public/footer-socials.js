/* Fetches social links from the public settings API and patches the footer's
   social icon anchors. Platforms already in the design system (X, LinkedIn,
   Instagram) get their href updated. Extra platforms (Facebook, YouTube, etc.)
   get a new icon anchor injected into the same social row. */

var SLUG_MAP = {
  instagram: 'instagram',
  linkedin:  'linkedin',
  twitter:   'x',
  facebook:  'facebook',
  youtube:   'youtube',
};

// Slugs the design system footer already renders — these get patched in place
var DS_SLUGS = ['x', 'linkedin', 'instagram'];

function slugInSrc(src, slug) {
  var path = src.split('?')[0].split('#')[0];
  return path.indexOf('/' + slug + '/') !== -1 || path.slice(-(slug.length + 1)) === '/' + slug;
}

function ensureProtocol(url) {
  url = url.trim();
  if (url && !/^https?:\/\//i.test(url)) return 'https://' + url;
  return url;
}

function buildSocialAnchor(slug, label, url) {
  var a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', label);
  a.style.cssText = [
    'width:36px', 'height:36px', 'border-radius:50%',
    'display:flex', 'align-items:center', 'justify-content:center',
    'border:1px solid rgba(255,249,244,0.20)',
    'background:transparent',
    'transition:border-color 0.15s,background 0.15s',
    'text-decoration:none', 'flex-shrink:0',
  ].join(';');
  a.addEventListener('mouseenter', function() {
    a.style.background = 'var(--action, #B5530A)';
    a.style.borderColor = 'var(--action, #B5530A)';
  });
  a.addEventListener('mouseleave', function() {
    a.style.background = 'transparent';
    a.style.borderColor = 'rgba(255,249,244,0.20)';
  });

  var img = document.createElement('img');
  img.src = 'https://cdn.simpleicons.org/' + slug + '/FFF9F4';
  img.alt = '';
  img.width = 15;
  img.height = 15;
  img.style.cssText = 'display:block';
  a.appendChild(img);
  return a;
}

function patchFooterSocials(socials) {
  var footer = document.querySelector('footer');
  if (!footer) return;

  var anchors = Array.from(footer.querySelectorAll('a'));

  // Find the social row — the flex container that holds the existing icon anchors
  var socialRow = null;
  anchors.forEach(function(a) {
    var img = a.querySelector('img');
    if (!img) return;
    var src = (img.getAttribute('src') || '').toLowerCase();
    if (DS_SLUGS.some(function(s) { return slugInSrc(src, s); })) {
      socialRow = a.parentNode;
    }
  });

  socials.forEach(function(entry) {
    if (!entry.url || !entry.url.trim()) return;
    var slug = SLUG_MAP[entry.platform] || entry.platform;
    var url = ensureProtocol(entry.url);

    // Try to find existing anchor for this slug
    var existing = anchors.find(function(a) {
      var img = a.querySelector('img');
      if (!img) return false;
      var src = (img.getAttribute('src') || img.src || '').toLowerCase();
      return slugInSrc(src, slug.toLowerCase());
    });

    if (existing) {
      existing.href = url;
      existing.target = '_blank';
      existing.rel = 'noopener noreferrer';
    } else if (socialRow) {
      // Platform not in the design system — inject a new anchor
      var newAnchor = buildSocialAnchor(slug, entry.label, url);
      socialRow.appendChild(newAnchor);
    }
  });
}

function initFooterSocials() {
  var apiBase = window.__apiBase || 'http://localhost:4000';
  fetch(apiBase + '/api/v1/admin/settings/public')
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      var socials = data && data.data && data.data.socials;
      if (!Array.isArray(socials) || socials.length === 0) return;

      var attempts = 40;
      function tryPatch() {
        if (document.querySelector('footer a img')) {
          patchFooterSocials(socials);
        } else if (attempts-- > 0) {
          setTimeout(tryPatch, 250);
        }
      }
      tryPatch();
    })
    .catch(function() {});
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFooterSocials);
} else {
  initFooterSocials();
}
