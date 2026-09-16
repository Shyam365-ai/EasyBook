/* ====================================================
   EasyBook — JavaScript: Interactions & Animations
   ==================================================== */

// ============ ANIMATED BACKGROUND CANVAS ============
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], animFrame;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.size = Math.random() * 1.5 + 0.5;
      this.alpha = Math.random() * 0.2 + 0.05;
      this.color = Math.random() > 0.5 ? '180,140,75' : '37,99,235';
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
      ctx.fill();
    }
  }

  function initParticles() {
    particles = [];
    const count = Math.floor((W * H) / 14000);
    for (let i = 0; i < count; i++) particles.push(new Particle());
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          const alpha = (1 - dist / 110) * 0.12;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(180,140,75,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    animFrame = requestAnimationFrame(loop);
  }

  resize();
  initParticles();
  loop();
  window.addEventListener('resize', () => { resize(); initParticles(); });
})();


// ============ NAVBAR SCROLL ============
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
})();


// ============ HAMBURGER MENU ============
(function initHamburger() {
  const btn = document.getElementById('hamburger');
  const links = document.getElementById('nav-links');
  btn.addEventListener('click', () => {
    links.classList.toggle('open');
  });
  // Close on nav link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => links.classList.remove('open'));
  });
})();


// ============ COUNTER ANIMATION ============
(function initCounters() {
  const counters = document.querySelectorAll('.stat-num');
  const duration = 2000;

  function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
})();


// ============ SCROLL ANIMATIONS (Fade-in & Steps) ============
(function initScrollAnimations() {
  // Fade-in for general elements
  const fadeEls = document.querySelectorAll(
    '.feature-card, .testi-card, .pricing-card, .section-header, .fleet-ai-content, .ai-metrics-panel, .contact-info, .contact-form-wrap'
  );
  fadeEls.forEach(el => el.classList.add('fade-in'));

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), 0);
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  fadeEls.forEach(el => fadeObserver.observe(el));

  // Step items
  const steps = document.querySelectorAll('.step-item');
  const stepObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        stepObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  steps.forEach(s => stepObserver.observe(s));
})();


// ============ SCROLL TO TOP ============
(function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 600) btn.classList.add('visible');
    else btn.classList.remove('visible');
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();


// ============ PRICING TOGGLE ============
(function initPricingToggle() {
  const btn = document.getElementById('pricing-toggle');
  const amounts = document.querySelectorAll('.price-amount');
  let isAnnual = false;

  btn.addEventListener('click', () => {
    isAnnual = !isAnnual;
    btn.classList.toggle('active', isAnnual);
    amounts.forEach(el => {
      const target = parseInt(isAnnual ? el.dataset.annual : el.dataset.monthly, 10);
      const start = parseInt(el.textContent.replace(',', ''), 10);
      animatePrice(el, start, target);
    });
  });

  function animatePrice(el, from, to) {
    const duration = 400;
    const startTime = performance.now();
    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      el.textContent = Math.round(from + (to - from) * t);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
})();


// ============ DASHBOARD TABS ============
(function initDashboardTabs() {
  const tabs = document.querySelectorAll('.dash-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Tab would swap dashboard image in a full app
      // Here we add a subtle glow flash
      const img = document.getElementById('dashboard-screenshot');
      img.style.transition = 'opacity 0.3s';
      img.style.opacity = '0.6';
      setTimeout(() => { img.style.opacity = '1'; }, 300);
    });
  });
})();


// ============ CONTACT FORM ============
(function initContactForm() {
  const form = document.getElementById('contact-form');
  const successMsg = document.getElementById('form-success');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = document.getElementById('form-submit');
    btn.textContent = 'Sending...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    // Simulate API call
    setTimeout(() => {
      form.reset();
      btn.textContent = '✓ Message Sent!';
      successMsg.style.display = 'block';
      setTimeout(() => {
        btn.textContent = 'Send Message & Book Demo';
        btn.disabled = false;
        btn.style.opacity = '1';
        successMsg.style.display = 'none';
        // Restore icon
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message & Book Demo`;
      }, 4000);
    }, 1500);
  });
})();


// ============ PARALLAX HERO IMAGE ============
(function initParallax() {
  const heroImgWrapper = document.querySelector('.hero-img-wrapper');
  if (!heroImgWrapper) return;
  window.addEventListener('mousemove', (e) => {
    const rx = (e.clientX / window.innerWidth - 0.5) * 6;
    const ry = (e.clientY / window.innerHeight - 0.5) * -6;
    heroImgWrapper.style.transform = `perspective(1000px) rotateY(${rx}deg) rotateX(${ry}deg)`;
  });
})();


// ============ SMOOTH ACTIVE NAV HIGHLIGHT ============
(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.style.color = '';
          if (link.getAttribute('href') === `#${entry.target.id}`) {
            link.style.color = '#fff';
          }
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => observer.observe(s));
})();


// ============ FLOATING CARDS MOUSE TILT ============
(function initFloatingCardsTilt() {
  const cards = document.querySelectorAll('.floating-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const rx = (e.clientY - rect.top - rect.height / 2) / 6;
      const ry = (e.clientX - rect.left - rect.width / 2) / 6;
      card.style.transform = `rotateX(${-rx}deg) rotateY(${ry}deg) scale(1.04)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();


// ============ AI PANEL — LIVE TYPING EFFECT ============
(function initLiveTyping() {
  const alerts = document.querySelectorAll('.amp-alert-item');
  const messages = [
    { cls: 'alert-info', icon: '📍', text: '3 vehicles repositioned to Airport Zone' },
    { cls: 'alert-warning', icon: '⚠️', text: 'Vehicle #TX-441: Engine temp high' },
    { cls: 'alert-success', icon: '💰', text: 'Dynamic pricing raised downtown +18%' },
    { cls: 'alert-info', icon: '🚗', text: 'Booking #BK-9921 confirmed: Tesla X' },
    { cls: 'alert-success', icon: '✅', text: 'Service completed: Vehicle #MX-220' },
  ];
  let idx = 3;
  setInterval(() => {
    const alert = alerts[Math.floor(Math.random() * alerts.length)];
    const msg = messages[idx % messages.length];
    alert.className = `amp-alert-item ${msg.cls}`;
    alert.innerHTML = `<span>${msg.icon}</span> ${msg.text}`;
    alert.style.opacity = '0';
    alert.style.transform = 'translateX(-10px)';
    setTimeout(() => {
      alert.style.transition = 'opacity 0.4s, transform 0.4s';
      alert.style.opacity = '1';
      alert.style.transform = 'translateX(0)';
    }, 50);
    idx++;
  }, 3000);
})();

// ============ CAPYBARA PRELOADER DISMISS ============
window.addEventListener('load', () => {
  const p = document.getElementById('preloader');
  if (p) {
    setTimeout(() => {
      p.classList.add('hidden');
      setTimeout(() => { p.style.display = 'none'; }, 450);
    }, 850);
  }
});

