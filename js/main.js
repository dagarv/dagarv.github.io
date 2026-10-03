(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var canAutoplay = !reduceMotion && !saveData;
  var STEAM = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/";
  var PLAY = "https://play-lh.googleusercontent.com/";

  var ICONS = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    muted: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>'
  };

  var nav = document.getElementById("nav");
  var navToggle = document.getElementById("navToggle");
  function onScroll() { nav.classList.toggle("solid", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  window.addEventListener("load", onScroll);
  navToggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelectorAll("#navLinks a").forEach(function (a) {
    a.addEventListener("click", function () {
      nav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) { revealObserver.observe(el); });

  function attachSource(video) {
    if (video.dataset.loaded) return;
    video.dataset.loaded = "1";
    var src = video.dataset.hls;
    if (window.Hls && window.Hls.isSupported()) {
      var hls = new window.Hls({ capLevelToPlayerSize: true, maxBufferLength: 20 });
      hls.loadSource(src);
      hls.attachMedia(video);
      video._hls = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    }
  }

  function play(video) {
    attachSource(video);
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  var cardVideos = [];

  function setMuteIcon(video) {
    if (video._muteBtn) {
      video._muteBtn.innerHTML = video.muted ? ICONS.muted : ICONS.sound;
      video._muteBtn.setAttribute("aria-label", video.muted ? "Unmute" : "Mute");
    }
  }

  function buildControls(video) {
    var wrap = video.parentElement;
    var big = document.createElement("button");
    big.className = "big-play";
    big.setAttribute("aria-label", "Play trailer");
    big.innerHTML = ICONS.play;
    big.addEventListener("click", function () {
      video.dataset.userPlay = "1";
      play(video);
    });

    var btns = document.createElement("div");
    btns.className = "media-btns";
    var toggle = document.createElement("button");
    toggle.innerHTML = ICONS.pause;
    toggle.setAttribute("aria-label", "Pause");
    toggle.addEventListener("click", function () {
      if (video.paused) {
        video.dataset.userPaused = "";
        play(video);
      } else {
        video.dataset.userPaused = "1";
        video.pause();
      }
    });
    var mute = document.createElement("button");
    mute.addEventListener("click", function () {
      var unmuting = video.muted;
      if (unmuting) cardVideos.forEach(function (v) { if (v !== video) { v.muted = true; setMuteIcon(v); } });
      video.muted = !unmuting;
      setMuteIcon(video);
      if (video.paused) play(video);
    });
    video._muteBtn = mute;
    setMuteIcon(video);
    var full = document.createElement("button");
    full.innerHTML = ICONS.full;
    full.setAttribute("aria-label", "Fullscreen");
    full.addEventListener("click", function () {
      play(video);
      if (wrap.requestFullscreen) wrap.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    });
    btns.appendChild(toggle);
    btns.appendChild(mute);
    btns.appendChild(full);

    wrap.appendChild(big);
    wrap.appendChild(btns);

    video.addEventListener("play", function () {
      wrap.classList.add("playing");
      toggle.innerHTML = ICONS.pause;
      toggle.setAttribute("aria-label", "Pause");
    });
    video.addEventListener("pause", function () {
      toggle.innerHTML = ICONS.play;
      toggle.setAttribute("aria-label", "Play");
    });
    video.addEventListener("click", function () { toggle.click(); });
  }

  var videoObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        var wants = (canAutoplay || v.dataset.userPlay) && !v.dataset.userPaused;
        if (wants) play(v);
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { threshold: 0.35 });

  document.querySelectorAll(".js-video").forEach(function (v) {
    if (v.hasAttribute("data-autoplay")) {
      if (canAutoplay) videoObserver.observe(v);
      return;
    }
    cardVideos.push(v);
    buildControls(v);
    videoObserver.observe(v);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) document.querySelectorAll(".js-video").forEach(function (v) { v.pause(); });
  });

  var lightbox = document.getElementById("lightbox");
  var lbImg = lightbox.querySelector("img");
  var lbList = [];
  var lbIndex = 0;

  function showLightbox(i) {
    lbIndex = (i + lbList.length) % lbList.length;
    lbImg.src = lbList[lbIndex].src;
    lbImg.alt = lbList[lbIndex].alt;
  }
  function openLightbox(list, i) {
    lbList = list;
    showLightbox(i);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightbox.querySelector(".lb-close").focus();
  }
  function closeLightbox() {
    lightbox.hidden = true;
    lbImg.removeAttribute("src");
    document.body.style.overflow = "";
  }
  lightbox.querySelector(".lb-close").addEventListener("click", closeLightbox);
  lightbox.querySelector(".lb-prev").addEventListener("click", function () { showLightbox(lbIndex - 1); });
  lightbox.querySelector(".lb-next").addEventListener("click", function () { showLightbox(lbIndex + 1); });
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", function (e) {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") showLightbox(lbIndex - 1);
    else if (e.key === "ArrowRight") showLightbox(lbIndex + 1);
  });

  document.querySelectorAll(".shots").forEach(function (box) {
    var title = box.closest(".project-card").querySelector("h2").firstChild.textContent.trim();
    var t = box.dataset.t;
    var list = box.dataset.shots.split(/\s+/).map(function (h, i) {
      var base = STEAM + box.dataset.app + "/" + h + "/ss_" + h;
      return { thumb: base + ".600x338.jpg?t=" + t, src: base + ".1920x1080.jpg?t=" + t, alt: title + " screenshot " + (i + 1) };
    });
    list.forEach(function (s, i) {
      var b = document.createElement("button");
      b.setAttribute("aria-label", "View " + s.alt);
      var img = document.createElement("img");
      img.src = s.thumb;
      img.alt = s.alt;
      img.loading = "lazy";
      b.appendChild(img);
      b.addEventListener("click", function () { openLightbox(list, i); });
      box.appendChild(b);
    });
  });

  document.querySelectorAll(".slideshow").forEach(function (box) {
    var title = box.closest(".project-card").querySelector("h2").firstChild.textContent.trim();
    var ids = box.dataset.slides.split(/\s+/);
    var list = ids.map(function (id, i) { return { src: PLAY + id + "=w1600", alt: title + " screenshot " + (i + 1) }; });
    var dots = document.createElement("div");
    dots.className = "dots";
    var imgs = list.map(function (s, i) {
      var img = document.createElement("img");
      img.src = PLAY + ids[i] + "=w1280";
      img.alt = s.alt;
      img.loading = i === 0 ? "eager" : "lazy";
      img.style.cursor = "zoom-in";
      img.addEventListener("click", function () { openLightbox(list, i); });
      box.appendChild(img);
      var d = document.createElement("button");
      d.setAttribute("aria-label", "Show screenshot " + (i + 1));
      d.addEventListener("click", function () { go(i); restart(); });
      dots.appendChild(d);
      return img;
    });
    box.appendChild(dots);
    var cur = 0;
    var timer = null;
    function go(i) {
      imgs[cur].classList.remove("on");
      dots.children[cur].classList.remove("on");
      cur = (i + imgs.length) % imgs.length;
      imgs[cur].classList.add("on");
      dots.children[cur].classList.add("on");
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(function () { go(cur + 1); }, 3500);
    }
    go(0);
    restart();
  });
})();
