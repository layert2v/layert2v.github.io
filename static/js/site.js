(function () {
  'use strict';

  // ----- Per-row video sync: keep the 4 layers of one sample in lockstep -----
  document.querySelectorAll('[data-sync-row]').forEach((row) => {
    const videos = row.querySelectorAll('video[data-row-sync]');
    if (videos.length < 2) return;
    const lead = videos[0];

    function syncFromLead() {
      if (lead.paused) return;
      const t = lead.currentTime;
      if (!Number.isFinite(t)) return;
      videos.forEach((v) => {
        if (v === lead) return;
        if (v.paused) v.play().catch(() => {});
        const drift = Math.abs(v.currentTime - t);
        if (drift > 0.12) {
          try { v.currentTime = t; } catch (e) { /* noop */ }
        }
      });
    }

    lead.addEventListener('play', syncFromLead);
    lead.addEventListener('seeked', syncFromLead);
    // Periodic nudge — independently-decoded videos always drift a bit.
    setInterval(syncFromLead, 1500);
  });

  // ----- Pause videos outside the visible carousel slide (saves decode work) -----
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const v = entry.target;
        if (entry.isIntersecting) {
          if (v.paused) v.play().catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.05, rootMargin: '120px 0px' });

    document.querySelectorAll('video[autoplay]').forEach((v) => io.observe(v));
  }

  // ----- Copy BibTeX -----
  document.querySelectorAll('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = document.getElementById(btn.dataset.copyTarget);
      if (!target) return;
      const text = target.textContent.trim();
      const label = btn.querySelector('.copy-text');
      const original = label ? label.textContent : 'Copy';

      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (_) { /* noop */ }
        document.body.removeChild(ta);
      }

      btn.classList.add('copied');
      if (label) label.textContent = 'Copied!';
      window.setTimeout(() => {
        btn.classList.remove('copied');
        if (label) label.textContent = original;
      }, 1600);
    });
  });

  // ----- Scroll to top -----
  const scrollBtn = document.querySelector('.scroll-to-top');
  if (scrollBtn) {
    window.addEventListener('scroll', () => {
      scrollBtn.classList.toggle('visible', window.scrollY > 480);
    }, { passive: true });
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ----- Bulma-carousel init (deferred script — retry until it loads) -----
  function initCarousel() {
    if (typeof bulmaCarousel === 'undefined') return false;
    const instances = bulmaCarousel.attach('#results-carousel', {
      slidesToScroll: 1,
      slidesToShow: 1,
      loop: true,
      infinite: true,
      navigation: true,
      pagination: true,
      autoplay: true,
      autoplaySpeed: 5000,
      pauseOnHover: true
    });

    // When the active slide changes, force its videos to play right away —
    // IntersectionObserver covers the steady state, but the new slide can
    // briefly appear before its observer entry fires.
    instances.forEach((inst) => {
      const root = inst.element || document.querySelector('#results-carousel');
      const playActive = () => {
        const active = root.querySelector('.slider-item.is-active video, .slider-item.is-current video');
        if (!active) return;
        root.querySelectorAll('.slider-item.is-active video, .slider-item.is-current video').forEach((v) => {
          v.play().catch(() => {});
        });
      };
      if (typeof inst.on === 'function') {
        inst.on('show', playActive);
        inst.on('after:show', playActive);
      }
    });
    return true;
  }

  if (!initCarousel()) {
    window.addEventListener('load', initCarousel);
  }
})();
