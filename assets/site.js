/* Fiste AI: the small script every page shares. Each part is an extra, and the pages read fine without it. */
(function () {
  "use strict";

  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* The Himalaya drawn as a waveform: a row of bars, white above the snow line. The stylesheet keeps them moving. */
  var PEAKS = [[0.05, 0.30, 0.09], [0.18, 0.54, 0.10], [0.32, 0.40, 0.08], [0.46, 0.70, 0.10],
               [0.64, 1.00, 0.13], [0.79, 0.58, 0.09], [0.93, 0.36, 0.08]];
  var SNOW_LINE = 0.52;

  function noise(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function height(t, n) {
    var h = 0.08;
    for (var k = 0; k < PEAKS.length; k++) {
      var d = Math.abs(t - PEAKS[k][0]) / PEAKS[k][2];
      if (d < 1) h = Math.max(h, PEAKS[k][1] * (1 - d) + 0.08 * d);
    }
    return Math.min(1, h * (0.9 + 0.2 * noise(n)));
  }

  function draw(range) {
    var style = window.getComputedStyle(range);
    var pitch = (parseFloat(style.getPropertyValue("--bar")) || 8) + (parseFloat(style.getPropertyValue("--gap")) || 6);
    var count = Math.ceil(range.clientWidth / pitch) + 1;
    var tall = range.clientHeight;
    var flat = range.hasAttribute("data-flat");
    var bars = "";
    for (var i = 0; i < count; i++) {
      var h = flat ? 0.05 + 0.07 * noise(i) : height(i / Math.max(1, count - 1), i);
      var cap = h > SNOW_LINE ? Math.round((h - SNOW_LINE) * tall * (0.75 + 0.5 * noise(i + 99))) : 0;
      bars += '<i style="--h:' + (h * 100).toFixed(1) + ";--i:" + i + ";--cap:" + cap + "px;--dip:" +
              (0.7 + 0.18 * noise(i + 31)).toFixed(2) + ";--d:" + (620 + Math.round(noise(i + 7) * 760)) + 'ms"></i>';
    }
    range.classList.toggle("still", calm);
    range.innerHTML = bars;
    range.setAttribute("data-width", range.clientWidth);
  }

  var ranges = [].slice.call(document.querySelectorAll(".range"));
  ranges.forEach(draw);

  var waiting = 0;
  window.addEventListener("resize", function () {
    clearTimeout(waiting);
    waiting = setTimeout(function () {
      ranges.forEach(function (range) {
        if (Math.abs(range.clientWidth - Number(range.getAttribute("data-width"))) > 13) draw(range);
      });
    }, 150);
  });

  /* A skyline that is off the screen stops moving, so it costs nothing while nobody sees it. */
  if ("IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("resting", !entry.isIntersecting);
      });
    });
    ranges.forEach(function (range) { seen.observe(range); });
  }

  /* Sections arrive as they scroll into view. What is on screen at the start is never hidden. */
  var arriving = [].slice.call(document.querySelectorAll(".reveal"));
  if (arriving.length && "IntersectionObserver" in window && !calm) {
    var fold = window.innerHeight * 0.94;
    arriving.forEach(function (node) {
      if (node.getBoundingClientRect().top < fold) node.classList.add("in");
    });
    document.documentElement.classList.add("rise");
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          watch.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    arriving.forEach(function (node) {
      if (!node.classList.contains("in")) watch.observe(node);
    });
  }

  /* Samples: tracks that share one audio element. While one plays, the skyline in the hero moves with it. */
  var skylines = [].slice.call(document.querySelectorAll(".hero .range"));

  function clock(seconds) {
    seconds = Math.max(0, Math.ceil(seconds || 0));
    return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  }

  [].forEach.call(document.querySelectorAll(".sample"), function (sample) {
    var audio = sample.querySelector("audio");
    if (!audio) return;
    var tracks = [].slice.call(sample.querySelectorAll(".track"));
    var current = null;

    function pressed(track, on) {
      track.querySelector(".play").setAttribute("aria-pressed", on ? "true" : "false");
    }
    function live(on) {
      skylines.forEach(function (range) { range.classList.toggle("live", on); });
    }
    function progress() {
      if (!current) return;
      var length = audio.duration || 0;
      current.querySelector(".bar span").style.width = (length ? (audio.currentTime / length) * 100 : 0) + "%";
      if (length) current.querySelector(".time").textContent = clock(length - audio.currentTime);
      if (!audio.paused) requestAnimationFrame(progress);
    }
    function reset(track) {
      track.querySelector(".bar span").style.width = "0";
      track.querySelector(".time").textContent = track.getAttribute("data-length");
      pressed(track, false);
    }

    tracks.forEach(function (track) {
      track.setAttribute("data-length", track.querySelector(".time").textContent);
      track.querySelector(".play").addEventListener("click", function () {
        if (current === track) {
          if (audio.paused) audio.play(); else audio.pause();
          return;
        }
        if (current) {
          audio.pause();
          reset(current);
        }
        current = track;
        audio.src = track.getAttribute("data-src");
        audio.play();
      });
    });
    audio.addEventListener("play", function () {
      if (!current) return;
      pressed(current, true);
      live(true);
      progress();
    });
    audio.addEventListener("pause", function () {
      if (current) pressed(current, false);
      live(false);
    });
    audio.addEventListener("ended", function () {
      if (current) reset(current);
      current = null;
      live(false);
    });
  });

  /* Copy buttons: data-copy holds a selector for the text to copy. */
  [].forEach.call(document.querySelectorAll("[data-copy]"), function (button) {
    if (!navigator.clipboard) {
      button.hidden = true;
      return;
    }
    button.addEventListener("click", function () {
      var source = document.querySelector(button.getAttribute("data-copy"));
      if (!source) return;
      navigator.clipboard.writeText(source.textContent).then(function () {
        var label = button.textContent;
        button.textContent = "Copied";
        setTimeout(function () { button.textContent = label; }, 1600);
      });
    });
  });
})();
