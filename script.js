/* ============================================
   ENGRAM â€” The Agent Memory Engine
   by MateoKnox
   script.js
   ============================================ */

// ===========================
// NAV SCROLL BEHAVIOR
// ===========================
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });

// ===========================
// HERO CANVAS â€” FLOATING DOTS
// ===========================
(function initCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [], animFrame;
  let mouse = { x: -9999, y: -9999, active: false };

  const PARTICLE_COUNT = 100;
  const ACCENT = '0,212,255';
  const PURPLE = '123,47,255';
  const MOUSE_RADIUS = 180;
  const MOUSE_FORCE = 0.08;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      baseVx: (Math.random() - 0.5) * 0.35,
      baseVy: (Math.random() - 0.5) * 0.35,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.4,
      baseR: 0,
      opacity: Math.random() * 0.4 + 0.1,
      baseOpacity: 0,
      color: Math.random() > 0.7 ? PURPLE : ACCENT,
    };
  }

  // Track mouse relative to canvas
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }, { passive: true });

  canvas.addEventListener('mouseleave', () => {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  }, { passive: true });

  function drawGrid() {
    const spacing = 60;
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x < W; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y < H; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // Draw glowing grid distortion near cursor
    if (mouse.active) {
      for (let x = 0; x < W; x += spacing) {
        for (let y = 0; y < H; y += spacing) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MOUSE_RADIUS) {
            const alpha = (1 - d / MOUSE_RADIUS) * 0.15;
            ctx.fillStyle = `rgba(${ACCENT},${alpha})`;
            ctx.fillRect(x - 1, y - 1, 2, 2);
          }
        }
      }
    }
  }

  function drawConnections() {
    const maxDist = 120;
    // Also draw connections from particles to mouse
    for (let i = 0; i < particles.length; i++) {
      // Particle-to-particle
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) {
          const alpha = (1 - d / maxDist) * 0.12;
          ctx.strokeStyle = `rgba(${ACCENT},${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
      // Particle-to-mouse connections
      if (mouse.active) {
        const dx = particles[i].x - mouse.x;
        const dy = particles[i].y - mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_RADIUS) {
          const alpha = (1 - d / MOUSE_RADIUS) * 0.25;
          ctx.strokeStyle = `rgba(${ACCENT},${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }
  }

  function drawMouseGlow() {
    if (!mouse.active) return;
    const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_RADIUS);
    gradient.addColorStop(0, 'rgba(0,212,255,0.06)');
    gradient.addColorStop(0.5, 'rgba(0,212,255,0.02)');
    gradient.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, MOUSE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawMouseGlow();
    drawConnections();
    particles.forEach(p => {
      // Initialize base values on first frame
      if (!p.baseR) { p.baseR = p.r; p.baseOpacity = p.opacity; }

      // Mouse interaction — push particles away + brighten near cursor
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_RADIUS && d > 0) {
          const force = (1 - d / MOUSE_RADIUS) * MOUSE_FORCE;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
          // Brighten and enlarge particles near cursor
          const proximity = 1 - d / MOUSE_RADIUS;
          p.opacity = p.baseOpacity + proximity * 0.5;
          p.r = p.baseR + proximity * 2;
        } else {
          p.opacity += (p.baseOpacity - p.opacity) * 0.05;
          p.r += (p.baseR - p.r) * 0.05;
        }
      } else {
        p.opacity += (p.baseOpacity - p.opacity) * 0.05;
        p.r += (p.baseR - p.r) * 0.05;
      }

      // Dampen velocity back toward base drift
      p.vx += (p.baseVx - p.vx) * 0.02;
      p.vy += (p.baseVy - p.vy) * 0.02;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
      ctx.fill();

      // Add glow to particles near mouse
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_RADIUS * 0.6) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
          const glowAlpha = (1 - d / (MOUSE_RADIUS * 0.6)) * 0.15;
          ctx.fillStyle = `rgba(${p.color},${glowAlpha})`;
          ctx.fill();
        }
      }

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    });
    animFrame = requestAnimationFrame(draw);
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
    draw();
  }

  window.addEventListener('resize', () => {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
  }, { passive: true });

  init();
})();

// ===========================
// TYPEWRITER â€” HERO CODE
// ===========================
(function initTypewriter() {
  const el = document.getElementById('hero-code');
  if (!el) return;

  const lines = [
    { type: 'comment', text: '# engram.toml' },
    { type: 'comment', text: '# The Agent Memory Engine' },
    { type: 'blank', text: '' },
    { type: 'bracket', text: '[agent]' },
    { type: 'kv', key: 'id', val: '"research-assistant"', valType: 'str' },
    { type: 'kv', key: 'version', val: '"0.1.0"', valType: 'str' },
    { type: 'blank', text: '' },
    { type: 'bracket', text: '[memory.core]' },
    { type: 'kv', key: 'immutable', val: 'true', valType: 'bool' },
    { type: 'kv', key: 'priority', val: '1', valType: 'num' },
    { type: 'blank', text: '' },
    { type: 'bracket', text: '[memory.buffer]' },
    { type: 'kv', key: 'ttl', val: '"5m"', valType: 'str' },
    { type: 'kv', key: 'capacity', val: '1000', valType: 'num' },
    { type: 'kv', key: 'strategy', val: '"lru"', valType: 'str' },
    { type: 'blank', text: '' },
    { type: 'bracket', text: '[memory.episode]' },
    { type: 'kv', key: 'half_life', val: '"2h"', valType: 'str' },
    { type: 'kv', key: 'decay', val: '"exponential"', valType: 'str' },
  ];

  let lineIdx = 0;
  let charIdx = 0;
  let html = '';
  const cursor = '<span class="cursor"></span>';

  function getLineHtml(line, partial) {
    if (line.type === 'blank') return '';
    if (line.type === 'comment') return `<span class="t-comment">${partial}</span>`;
    if (line.type === 'bracket') return `<span class="t-bracket">${partial}</span>`;
    if (line.type === 'kv') {
      const full = `${line.key} = ${line.val}`;
      const sub = full.slice(0, partial.length);
      if (sub.length <= line.key.length) {
        return `<span class="t-key">${sub}</span>`;
      } else if (sub.length <= line.key.length + 3) {
        return `<span class="t-key">${line.key}</span>${sub.slice(line.key.length)}`;
      } else {
        const valPart = sub.slice(line.key.length + 3);
        return `<span class="t-key">${line.key}</span> = <span class="t-${line.valType}">${valPart}</span>`;
      }
    }
    return partial;
  }

  function getFullText(line) {
    if (line.type === 'blank') return '';
    if (line.type === 'kv') return `${line.key} = ${line.val}`;
    return line.text;
  }

  function tick() {
    if (lineIdx >= lines.length) {
      el.innerHTML = html + cursor;
      return;
    }

    const line = lines[lineIdx];
    const fullText = getFullText(line);

    if (charIdx <= fullText.length) {
      const partial = fullText.slice(0, charIdx);
      const currentLine = line.type === 'blank' ? '' : getLineHtml(line, partial);

      el.innerHTML = html + currentLine + cursor;
      charIdx++;

      const delay = line.type === 'comment' ? 30 : line.type === 'blank' ? 0 : 35;
      setTimeout(tick, delay);
    } else {
      // Line done
      if (line.type === 'blank') {
        html += '\n';
      } else {
        html += getLineHtml(line, fullText) + '\n';
      }
      lineIdx++;
      charIdx = 0;
      setTimeout(tick, line.type === 'blank' ? 60 : 120);
    }
  }

  // Start after hero animations settle
  setTimeout(tick, 1400);
})();

// ===========================
// INTERSECTION OBSERVER â€” REVEAL
// ===========================
(function initReveal() {
  const revealEls = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = '0s';
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealEls.forEach(el => observer.observe(el));
})();

// ===========================
// STAGGER CHILDREN ANIMATIONS
// ===========================
(function initStagger() {
  const staggerParents = [
    '.layers-grid',
    '.compare-grid',
    '.philosophy-grid',
    '.logos-grid',
    '.frameworks-grid',
    '.code-split',
  ];

  staggerParents.forEach(selector => {
    const parent = document.querySelector(selector);
    if (!parent) return;

    const children = parent.querySelectorAll('.reveal, .layer-card, .philosophy-card, .logo-item, .framework-item, .compare-col, .code-block');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          children.forEach((child, i) => {
            setTimeout(() => {
              child.style.opacity = '1';
              child.style.transform = 'translateY(0)';
            }, i * 90);
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    children.forEach(child => {
      child.style.opacity = '0';
      child.style.transform = 'translateY(20px)';
      child.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
      child.classList.remove('visible');
    });

    observer.observe(parent);
  });
})();

// ===========================
// COPY BUTTON
// ===========================
(function initCopy() {
  const btn = document.getElementById('copy-btn');
  if (!btn) return;

  const code = document.querySelector('.config-code');
  if (!code) return;

  btn.addEventListener('click', () => {
    const text = code.innerText || code.textContent;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!';
      btn.style.color = 'var(--accent)';
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.style.color = '';
      }, 2000);
    });
  });
})();

// ===========================
// SMOOTH HOVER TILT ON CARDS
// ===========================
(function initTilt() {
  const cards = document.querySelectorAll('.layer-card, .philosophy-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const tiltX = dy * -5;
      const tiltY = dx * 5;
      card.style.transform = `translateY(-4px) perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

// ===========================
// ACTIVE NAV LINK HIGHLIGHT
// ===========================
(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.style.color = '';
      if (link.getAttribute('href') === `#${current}`) {
        link.style.color = 'var(--accent)';
      }
    });
  }, { passive: true });
})();
