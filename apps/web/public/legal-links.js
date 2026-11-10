/* Patches the footer's Terms of service, Privacy policy and Help centre
   links to point to the real routes. The footer renders these with href="#";
   this script replaces them after the React tree mounts. Loaded by every public page. */
(function () {
  var LEGAL = {
    'Terms of service': '/legal/terms',
    'Privacy policy': '/legal/privacy',
    'Help centre': '/help',
  };

  function patchLinks() {
    var anchors = Array.from(document.querySelectorAll('a'));
    anchors.forEach(function (a) {
      var text = (a.textContent || '').trim();
      if (LEGAL[text] && a.getAttribute('href') === '#') {
        a.href = LEGAL[text];
      }
    });
  }

  var observer = new MutationObserver(function () {
    patchLinks();
  });

  function start() {
    patchLinks();
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
