/**
 * ═══════════════════════════════════════════════════════════════
 *  THE GHOST PERFUMES — Animation Controller
 * ═══════════════════════════════════════════════════════════════
 *
 *  Ghost particle system (Canvas 2D), GSAP ScrollTrigger reveals,
 *  3D tilt cards, parallax backgrounds, hero text animation,
 *  counter animation, lazy-loading with fade-in, navbar scroll
 *  effect, and back-to-top button.
 *
 *  External deps (CDN): gsap.min.js, ScrollTrigger.min.js
 * ═══════════════════════════════════════════════════════════════
 */

/* global gsap, ScrollTrigger */

const GhostAnimations = (function () {
  'use strict';

  // ────────────────────────────────────────────────────
  //  Ghost Particle System (Canvas 2D)
  // ────────────────────────────────────────────────────
  let _particleCanvas  = null;
  let _particleCtx     = null;
  let _particles       = [];
  let _particleRAF     = null;
  const PARTICLE_COUNT = 40;

  /**
   * Create a full-viewport <canvas> pinned behind the content.
   * @param {string} [containerId] — optional wrapper id; defaults to <body>
   */
  function initParticles(containerId) {
    const wrapper = containerId
      ? document.getElementById(containerId)
      : document.body;
    if (!wrapper) return;

    // Avoid double-init
    if (_particleCanvas) return;

    _particleCanvas = document.createElement('canvas');
    _particleCanvas.id = 'ghost-particles';
    Object.assign(_particleCanvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '0',
      opacity: '0.6'
    });

    wrapper.prepend(_particleCanvas);
    _particleCtx = _particleCanvas.getContext('2d');

    _resizeCanvas();
    window.addEventListener('resize', _resizeCanvas);
    _seedParticles();
    _animateParticles();
  }

  function _resizeCanvas() {
    if (!_particleCanvas) return;
    _particleCanvas.width  = window.innerWidth;
    _particleCanvas.height = window.innerHeight;
  }

  function _seedParticles() {
    _particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      _particles.push(_createParticle());
    }
  }

  function _createParticle(startFromBottom) {
    const w = _particleCanvas.width;
    const h = _particleCanvas.height;
    const radius = Math.random() * 4 + 1.5;                       // 1.5–5.5 px
    const purple = Math.random() > 0.4;                            // ~60 % purple, 40 % white

    return {
      x:      Math.random() * w,
      y:      startFromBottom ? h + radius : Math.random() * h,
      r:      radius,
      alpha:  Math.random() * 0.35 + 0.05,                        // 0.05–0.4
      vx:     (Math.random() - 0.5) * 0.3,                        // subtle horizontal drift
      vy:     -(Math.random() * 0.5 + 0.15),                      // drift upward
      color:  purple
        ? `rgba(179, 136, 255, VAR_ALPHA)`                        // soft purple
        : `rgba(255, 255, 255, VAR_ALPHA)`,                       // ghost white
      pulse:  Math.random() * Math.PI * 2                          // phase offset for shimmer
    };
  }

  function _animateParticles() {
    if (!_particleCtx) return;
    const ctx = _particleCtx;
    const w   = _particleCanvas.width;
    const h   = _particleCanvas.height;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < _particles.length; i++) {
      const p = _particles[i];

      // Move
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.015;

      // Shimmer
      const shimmer = Math.sin(p.pulse) * 0.15;
      const alpha   = Math.max(0, Math.min(1, p.alpha + shimmer));

      // Draw orb
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      const fill = p.color.replace('VAR_ALPHA', alpha.toFixed(3));
      gradient.addColorStop(0, fill);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      // Recycle when off-screen
      if (p.y < -p.r * 2 || p.x < -20 || p.x > w + 20) {
        _particles[i] = _createParticle(true);
      }
    }

    _particleRAF = requestAnimationFrame(_animateParticles);
  }

  function destroyParticles() {
    cancelAnimationFrame(_particleRAF);
    if (_particleCanvas && _particleCanvas.parentNode) {
      _particleCanvas.parentNode.removeChild(_particleCanvas);
    }
    _particleCanvas = null;
    _particleCtx    = null;
    _particles      = [];
    window.removeEventListener('resize', _resizeCanvas);
  }

  // ────────────────────────────────────────────────────
  //  GSAP ScrollTrigger — reveal animations
  // ────────────────────────────────────────────────────
  function initScrollReveals() {
    const revealEls = document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale');
    
    // Always mark above-the-fold hero elements as revealed immediately
    document.querySelectorAll('.hero .reveal, .hero .reveal-up').forEach(el => {
      el.classList.add('revealed');
      el.style.opacity = '1';
      el.style.transform = 'none';
    });

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      revealEls.forEach(el => el.classList.add('revealed'));
      return;
    }

    try {
      gsap.registerPlugin(ScrollTrigger);
      document.body.classList.add('js-reveal-ready');

      // Fade-up elements
      gsap.utils.toArray('.reveal, .reveal-up').forEach(el => {
        if (el.closest('.hero')) {
          el.classList.add('revealed');
          return;
        }
        gsap.to(el, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            onEnter: () => el.classList.add('revealed'),
            toggleActions: 'play none none none'
          }
        });
      });

      // Fade-left elements
      gsap.utils.toArray('.reveal-left').forEach(el => {
        gsap.to(el, {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            onEnter: () => el.classList.add('revealed')
          }
        });
      });

      // Fade-right elements
      gsap.utils.toArray('.reveal-right').forEach(el => {
        gsap.to(el, {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            onEnter: () => el.classList.add('revealed')
          }
        });
      });

      // Scale-up
      gsap.utils.toArray('.reveal-scale').forEach(el => {
        gsap.to(el, {
          scale: 1,
          opacity: 1,
          duration: 0.8,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            onEnter: () => el.classList.add('revealed')
          }
        });
      });
    } catch (e) {
      console.warn('Scroll reveal fallback activated:', e);
      revealEls.forEach(el => el.classList.add('revealed'));
    }
  }

  // ────────────────────────────────────────────────────
  //  3D Card Tilt (mouse-follow perspective)
  // ────────────────────────────────────────────────────
  function initTiltCards() {
    document.querySelectorAll('.tilt-card').forEach(card => {
      card.addEventListener('mousemove', _handleTilt);
      card.addEventListener('mouseleave', _resetTilt);
    });
  }

  function _handleTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const y    = e.clientY - rect.top;
    const cx   = rect.width  / 2;
    const cy   = rect.height / 2;

    const rotateX = ((y - cy) / cy) * -8;   // max ±8 deg
    const rotateY = ((x - cx) / cx) *  8;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03,1.03,1.03)`;
    card.style.transition = 'transform 0.1s ease-out';

    // Glare / highlight (optional inner div .tilt-glare)
    const glare = card.querySelector('.tilt-glare');
    if (glare) {
      glare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.18) 0%, transparent 60%)`;
    }
  }

  function _resetTilt(e) {
    const card = e.currentTarget;
    card.style.transform  = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
    card.style.transition = 'transform 0.5s ease';
    const glare = card.querySelector('.tilt-glare');
    if (glare) glare.style.background = 'transparent';
  }

  // ────────────────────────────────────────────────────
  //  Smooth scroll to anchor
  // ────────────────────────────────────────────────────
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ────────────────────────────────────────────────────
  //  Page-load staggered reveals
  // ────────────────────────────────────────────────────
  function pageLoadReveal() {
    if (typeof gsap === 'undefined') return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.page-header, .hero', { opacity: 0, y: -30, duration: 0.6 })
      .from('.stagger-reveal', { opacity: 0, y: 40, duration: 0.5, stagger: 0.12 }, '-=0.3');
  }

  // ────────────────────────────────────────────────────
  //  Hero text — letter-by-letter reveal
  // ────────────────────────────────────────────────────
  function heroTextReveal(selector) {
    const el = document.querySelector(selector || '.hero-title');
    if (!el) return;
    if (el.classList.contains('hero-char-animated')) return;

    // Ensure parent hero-title is fully visible and not hidden
    el.style.opacity = '1';
    el.style.visibility = 'visible';

    if (typeof gsap === 'undefined') {
      el.classList.add('hero-char-animated');
      return;
    }

    try {
      const text = el.textContent.trim();
      if (!text) return;
      el.setAttribute('aria-label', text);
      el.innerHTML = '';

      // Split into words so no word is ever broken across lines
      const words = text.split(/\s+/);
      words.forEach((word) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'hero-word';
        wordSpan.style.display = 'inline-block';
        wordSpan.style.whiteSpace = 'nowrap';
        wordSpan.style.margin = '0 0.18em';

        [...word].forEach(char => {
          const charSpan = document.createElement('span');
          charSpan.textContent = char;
          charSpan.className = 'hero-char';
          charSpan.style.display = 'inline-block';
          charSpan.style.color = '#ffffff';
          wordSpan.appendChild(charSpan);
        });

        el.appendChild(wordSpan);
      });

      el.classList.add('hero-char-animated');

      gsap.fromTo(el.querySelectorAll('.hero-char'), 
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.025,
          duration: 0.5,
          ease: 'power3.out',
          delay: 0.08
        }
      );
    } catch (e) {
      console.warn('Hero text reveal fallback:', e);
      el.style.opacity = '1';
    }
  }

  // ────────────────────────────────────────────────────
  //  Parallax background on scroll
  // ────────────────────────────────────────────────────
  function initParallax() {
    const parallaxEls = document.querySelectorAll('[data-parallax]');
    if (!parallaxEls.length) return;

    const onScroll = () => {
      const scrollY = window.pageYOffset;
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.3;
        el.style.transform = `translateY(${scrollY * speed}px)`;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ────────────────────────────────────────────────────
  //  Counter animation (e.g. stats section)
  // ────────────────────────────────────────────────────
  function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el    = entry.target;
        const end   = parseInt(el.dataset.counter, 10) || 0;
        const dur   = parseInt(el.dataset.counterDuration, 10) || 2000;
        const start = 0;
        const startTime = performance.now();

        const step = (now) => {
          const progress = Math.min((now - startTime) / dur, 1);
          const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          el.textContent = Math.floor(eased * (end - start) + start);
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = end;
        };
        requestAnimationFrame(step);
        observer.unobserve(el);
      });
    }, { threshold: 0.4 });

    counters.forEach(el => observer.observe(el));
  }

  // ────────────────────────────────────────────────────
  //  Lazy-load images with fade-in
  // ────────────────────────────────────────────────────
  function initLazyImages() {
    const images = document.querySelectorAll('img.lazy, img[data-src]');
    if (!images.length) return;

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          _loadImage(img);
          obs.unobserve(img);
        });
      }, { rootMargin: '200px' });

      images.forEach(img => obs.observe(img));
    } else {
      // Fallback: load all
      images.forEach(_loadImage);
    }
  }

  function _loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.5s ease';
    img.onload = () => {
      img.style.opacity = '1';
      img.classList.add('loaded');
    };
    img.src = src;
    img.removeAttribute('data-src');
    img.classList.remove('lazy');
  }

  // ────────────────────────────────────────────────────
  //  Navbar scroll effect (transparent → solid)
  // ────────────────────────────────────────────────────
  function initNavbarScroll() {
    const nav = document.querySelector('.navbar, header.nav, nav');
    if (!nav) return;

    const THRESHOLD = 50;

    const onScroll = () => {
      if (window.pageYOffset > THRESHOLD) {
        nav.classList.add('navbar--scrolled');
      } else {
        nav.classList.remove('navbar--scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state
  }

  // ────────────────────────────────────────────────────
  //  Back-to-top button
  // ────────────────────────────────────────────────────
  function initBackToTop() {
    let btn = document.getElementById('back-to-top');

    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'back-to-top';
      btn.className = 'back-to-top';
      btn.setAttribute('aria-label', 'Back to top');
      btn.innerHTML = '↑';
      document.body.appendChild(btn);
    }

    const toggle = () => {
      btn.classList.toggle('visible', window.pageYOffset > 400);
    };

    window.addEventListener('scroll', toggle, { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    toggle();
  }

  // ────────────────────────────────────────────────────
  //  Master initialiser
  // ────────────────────────────────────────────────────
  /**
   * Call once from app.js to boot all animations for the page.
   * @param {{ particles?: boolean, hero?: boolean|string }} opts
   */
  function init(opts) {
    const o = opts || {};

    if (o.particles !== false) initParticles(o.particleContainer);
    initScrollReveals();
    initTiltCards();
    initSmoothScroll();
    pageLoadReveal();
    if (o.hero) heroTextReveal(typeof o.hero === 'string' ? o.hero : undefined);
    initParallax();
    initCounters();
    initLazyImages();
    initNavbarScroll();
    initBackToTop();
  }

  // ────────────────────────────────────────────────────
  //  Public API
  // ────────────────────────────────────────────────────
  return Object.freeze({
    init,
    initParticles,
    destroyParticles,
    initScrollReveals,
    initTiltCards,
    initSmoothScroll,
    pageLoadReveal,
    heroTextReveal,
    initParallax,
    initCounters,
    initLazyImages,
    initNavbarScroll,
    initBackToTop
  });
})();
