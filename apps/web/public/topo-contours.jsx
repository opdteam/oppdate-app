/* Shared: animated topographic contour lines on canvas.
   Registers window.TopoContours as a React component.
   Uses Perlin noise + marching squares to draw flowing iso-lines
   that drift slowly over time. Include this script before any
   page JSX that uses <TopoContours />. */
(function () {
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  function TopoContours() {
    var ref = React.useRef(null);
    React.useEffect(function () {
      var canvas = ref.current;
      if (!canvas || REDUCED.matches) return;
      var ctx = canvas.getContext('2d');
      var w, h, raf;

      var resize = function () {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = canvas.offsetWidth;
        h = canvas.offsetHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      var ro = new ResizeObserver(resize);
      ro.observe(canvas);

      var P = new Uint8Array(512);
      for (var i = 0; i < 256; i++) P[i] = i;
      for (var i = 255; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = P[i]; P[i] = P[j]; P[j] = t; }
      for (var i = 0; i < 256; i++) P[i + 256] = P[i];

      var fade = function (t) { return t * t * t * (t * (t * 6 - 15) + 10); };
      var lerp = function (a, b, t) { return a + (b - a) * t; };
      var grad = function (hash, x, y) {
        var h = hash & 3;
        var u = h < 2 ? x : -x;
        var v = h === 0 || h === 3 ? y : -y;
        return u + v;
      };
      var noise = function (x, y) {
        var xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
        var xf = x - Math.floor(x), yf = y - Math.floor(y);
        var u = fade(xf), v = fade(yf);
        var aa = P[P[xi] + yi], ab = P[P[xi] + yi + 1];
        var ba = P[P[xi + 1] + yi], bb = P[P[xi + 1] + yi + 1];
        return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u), lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
      };

      var CELL = 10;
      var LEVELS = [-0.28, -0.14, 0, 0.14, 0.28];
      var COLORS = [
        'rgba(194,65,12,0.07)',
        'rgba(212,132,58,0.09)',
        'rgba(194,65,12,0.11)',
        'rgba(232,168,77,0.09)',
        'rgba(194,65,12,0.07)',
      ];
      var SCALE = 0.012;
      var DRIFT = 0.00008;

      var draw = function (time) {
        ctx.clearRect(0, 0, w, h);
        var cols = Math.ceil(w / CELL) + 1;
        var rows = Math.ceil(h / CELL) + 1;
        var tt = time * DRIFT;

        var field = new Float32Array(cols * rows);
        for (var iy = 0; iy < rows; iy++) {
          for (var ix = 0; ix < cols; ix++) {
            var nx = ix * CELL * SCALE + tt;
            var ny = iy * CELL * SCALE + tt * 0.7;
            field[iy * cols + ix] = noise(nx, ny) + noise(nx * 2.1 + 5.3, ny * 2.1 + 2.7) * 0.5;
          }
        }

        var cx = w * 0.5, cy = h * 0.5;
        var maxR = Math.sqrt(cx * cx + cy * cy);

        for (var li = 0; li < LEVELS.length; li++) {
          var threshold = LEVELS[li];
          ctx.beginPath();
          for (var iy = 0; iy < rows - 1; iy++) {
            for (var ix = 0; ix < cols - 1; ix++) {
              var i0 = iy * cols + ix;
              var v0 = field[i0], v1 = field[i0 + 1];
              var v2 = field[i0 + cols + 1], v3 = field[i0 + cols];
              var c0 = v0 >= threshold ? 1 : 0;
              var c1 = v1 >= threshold ? 1 : 0;
              var c2 = v2 >= threshold ? 1 : 0;
              var c3 = v3 >= threshold ? 1 : 0;
              var code = c0 | (c1 << 1) | (c2 << 2) | (c3 << 3);
              if (code === 0 || code === 15) continue;

              var x0 = ix * CELL, y0 = iy * CELL;
              var lp = function (a, b) { return (threshold - a) / (b - a); };

              var top = { x: x0 + lp(v0, v1) * CELL, y: y0 };
              var right = { x: x0 + CELL, y: y0 + lp(v1, v2) * CELL };
              var bottom = { x: x0 + lp(v3, v2) * CELL, y: y0 + CELL };
              var left = { x: x0, y: y0 + lp(v0, v3) * CELL };

              var seg = function (a, b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); };
              switch (code) {
                case 1: case 14: seg(top, left); break;
                case 2: case 13: seg(top, right); break;
                case 3: case 12: seg(left, right); break;
                case 4: case 11: seg(right, bottom); break;
                case 5: seg(top, right); seg(bottom, left); break;
                case 6: case 9: seg(top, bottom); break;
                case 7: case 8: seg(left, bottom); break;
                case 10: seg(top, left); seg(right, bottom); break;
              }
            }
          }
          ctx.strokeStyle = COLORS[li];
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        var vg = ctx.createRadialGradient(cx, cy, maxR * 0.25, cx, cy, maxR * 0.92);
        vg.addColorStop(0, 'rgba(247,243,239,0)');
        vg.addColorStop(1, 'rgba(247,243,239,1)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);

        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
      return function () { cancelAnimationFrame(raf); ro.disconnect(); };
    }, []);
    return React.createElement('canvas', {
      ref: ref,
      'aria-hidden': true,
      style: {
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      },
    });
  }

  window.TopoContours = TopoContours;
})();
