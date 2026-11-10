/* Patches the design system footer's Terms of service, Privacy policy and Help centre
   links to point to the real routes. The DS bundle renders these with href="#"; this
   script replaces them after the React tree mounts. Loaded by every public page. */
(function () {
  var LEGAL = {
    'Terms of service': '/legal/terms',
    'Privacy policy': '/legal/privacy',
    'Help centre': '/help',
  };

  function patchLinks() {
    var footer = document.querySelector('footer');
    if (!footer) return false;
    var anchors = Array.from(footer.querySelectorAll('a'));
    var patched = 0;
    anchors.forEach(function (a) {
      var text = (a.textContent || '').trim();
      if (LEGAL[text]) {
        a.href = LEGAL[text];
        patched++;
      }
    });
    return patched > 0;
  }

  var attempts = 60;
  function tryPatch() {
    if (patchLinks()) return;
    if (attempts-- > 0) setTimeout(tryPatch, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryPatch);
  } else {
    tryPatch();
  }
})();
