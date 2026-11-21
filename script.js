(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  // Theme toggle with local persistence.
  const themeToggle = $('#themeToggle');
  themeToggle?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('imran-portfolio-theme', next); } catch (_) {}
    const themeColor = $('meta[name="theme-color"]');
    if (themeColor) themeColor.content = next === 'dark' ? '#08141b' : '#eff5f2';
  });

  // Mobile navigation: closes on route selection, outside click, or Escape.
  const menu = $('#mainNav');
  const menuToggle = $('#menuToggle');
  const setMenu = (open) => {
    if (!menu || !menuToggle) return;
    menu.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  };
  menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  $$('.main-nav a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', (event) => {
    if (menu?.classList.contains('open') && !menu.contains(event.target) && !menuToggle?.contains(event.target)) setMenu(false);
  });

  // Resume dialog. The panel is intentionally inset and height-limited on mobile.
  const modal = $('#resumeModal');
  const dialog = $('.resume-dialog', modal || document);
  const openResumeButton = $('#openResume');
  const downloadResumeButton = $('#downloadResume');
  const closeResumeButton = $('#closeResume');
  const printResumeButton = $('#printResume');
  let lastFocusedElement = null;

  const openResume = (printAfterOpen = false) => {
    if (!modal || !dialog) return;
    lastFocusedElement = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    closeResumeButton?.focus();
    if (printAfterOpen) window.setTimeout(() => window.print(), 220);
  };
  const closeResume = () => {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    lastFocusedElement?.focus?.();
  };
  openResumeButton?.addEventListener('click', () => openResume(false));
  downloadResumeButton?.addEventListener('click', () => openResume(true));
  closeResumeButton?.addEventListener('click', closeResume);
  printResumeButton?.addEventListener('click', () => window.print());
  modal?.addEventListener('click', (event) => { if (event.target === modal) closeResume(); });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMenu(false);
      if (modal?.classList.contains('open')) closeResume();
    }
    if (event.key === 'Tab' && modal?.classList.contains('open') && dialog) {
      const focusable = $$('button, a[href], [tabindex]:not([tabindex="-1"])', dialog).filter((el) => !el.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  // Scroll reveal animations: intelligent staggered cascading for cards and sections.
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    // Set up natural sequential staggering for items inside grids and groups
    const groupContainers = $$('.skills-grid, .education-grid, .detail-stack, .contact-actions, .timeline');
    groupContainers.forEach((container) => {
      const items = $$(':scope > .reveal', container);
      items.forEach((item, index) => {
        item.dataset.staggered = 'true';
        item.style.transitionDelay = `${index * 90}ms`;
      });
    });

    // Provide clean default delay for non-grouped reveal items
    revealItems.forEach((item) => {
      if (!item.dataset.staggered && !item.style.transitionDelay) {
        item.style.transitionDelay = '0ms';
      }
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
        $$('[data-count]', entry.target).forEach(animateCounter);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    $$('[data-count]').forEach(animateCounter);
  }

  function animateCounter(element) {
    if (element.dataset.counted === 'true') return;
    element.dataset.counted = 'true';
    const target = Number(element.dataset.count || 0);
    const suffix = element.dataset.suffix || '';
    if (reducedMotion) { element.textContent = `${target}${suffix}`; return; }
    const start = performance.now();
    const duration = 950;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Scroll progress, header state, ambient parallax and back-to-top.
  const progressBar = $('#scrollProgress');
  const header = $('#siteHeader');
  const backToTop = $('#backToTop');
  const parallaxOrbs = $$('.orb[data-parallax]');
  let scrollFramePending = false;
  const updateScrollUI = () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.width = `${maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0}%`;
    header?.classList.toggle('scrolled', scrollY > 24);
    backToTop?.classList.toggle('visible', scrollY > 500);
    if (!reducedMotion && window.innerWidth > 760) {
      parallaxOrbs.forEach((orb) => {
        const speed = Number(orb.dataset.parallax || 0);
        orb.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
      });
    }
    scrollFramePending = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollFramePending) {
      requestAnimationFrame(updateScrollUI);
      scrollFramePending = true;
    }
  }, { passive: true });
  updateScrollUI();
  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));

  // Highlight the current navigation section.
  if ('IntersectionObserver' in window) {
    const navLinks = $$('.main-nav a[href^="#"]');
    const sections = $$('main section[id]');
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-38% 0px -54% 0px' });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  // A tiny desktop-only tilt; disabled for touch and reduced-motion users.
  if (!reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.profile-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg) translateY(-2px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  const year = $('#currentYear');
  if (year) year.textContent = new Date().getFullYear();
})();
