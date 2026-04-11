/* ============================================================
   ATKINS PERFORMANCE — Main JavaScript v2
   ============================================================ */

/* ── Stripe Payment Link URLs ───────────────────────────────── */
const STRIPE_LINKS = {
  '1-month':  'https://buy.stripe.com/28EaEX5oZ6OH0nbekra7C00',
  '6-months': 'https://buy.stripe.com/cNi28r6t34Gzgm90tBa7C01',
  '12-months':'https://buy.stripe.com/9B6fZh2cNa0Tgm9fova7C02',
};

/* ── EmailJS config ─────────────────────────────────────────── */
const EJS = {
  publicKey:  '4g4T_HAzelIKYcJeC',
  serviceId:  'service_bmd3ium',
  templateId: 'template_j3zt2rb',
};
if (typeof emailjs !== 'undefined') emailjs.init({ publicKey: EJS.publicKey });

/* ── Web3Forms key (split to deter automated scrapers) ─────────
   Real security: set domain restriction in your Web3Forms
   dashboard → Settings → Allowed Domains → atkinsperformance.com
   ──────────────────────────────────────────────────────────── */
const _w = ['9b9bca86','f1c0','4ccf','a94a','1d10af679de6'];
const W3F_KEY = _w.join('-');

/* ============================================================
   SECURITY UTILITIES
   ============================================================ */

/* ── Input sanitization ─────────────────────────────────────
   Strips HTML tags, control characters, and trims whitespace.
   Limits field length to prevent payload stuffing.          */
function sanitize(value, maxLen = 500) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[<>"'`]/g, '')           // strip remaining dangerous chars
    .replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, '') // strip control chars
    .trim()
    .slice(0, maxLen);
}

/* ── Field validators ───────────────────────────────────────── */
const VALIDATORS = {
  fullName:     v => /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]{2,80}$/.test(v.trim()),
  email:        v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  dob:          v => {
    if (!v) return false;
    const d = new Date(v);
    const age = (Date.now() - d) / (365.25 * 24 * 3600 * 1000);
    return age >= 13 && age <= 100;
  },
  phone:        v => /^[+\d\s\-().]{7,20}$/.test(v.trim()),
  bodyweight:   v => { const n = parseFloat(v); return n >= 30 && n <= 300; },
  height:       v => { const n = parseInt(v); return n >= 100 && n <= 250; },
  practiceHours:v => { const n = parseFloat(v); return n >= 0 && n <= 60; },
  sport:        v => v.trim().length >= 2 && v.trim().length <= 100,
  primaryGoal:  v => v.trim().length >= 10 && v.trim().length <= 1000,
  currentInjuries: v => v.trim().length >= 2 && v.trim().length <= 500,
  gymName:      v => v.trim().length >= 2 && v.trim().length <= 150,
};

/* ── Validate and report a single field ─────────────────────── */
function validateField(name, value, inputEl) {
  const fn = VALIDATORS[name];
  if (!fn) return true; // no rule = pass
  const ok = fn(value);
  if (inputEl) {
    inputEl.setCustomValidity(ok ? '' : getValidationMessage(name));
    inputEl.reportValidity();
  }
  return ok;
}

function getValidationMessage(name) {
  const msgs = {
    fullName:     'Please enter your full name (letters only, 2–80 characters).',
    email:        'Please enter a valid email address.',
    dob:          'Please enter a valid date of birth. You must be at least 13 years old.',
    phone:        'Please enter a valid phone number.',
    bodyweight:   'Please enter a bodyweight between 30 and 300 kg.',
    height:       'Please enter a height between 100 and 250 cm.',
    practiceHours:'Please enter a value between 0 and 60 hours.',
    sport:        'Please enter your sport (2–100 characters).',
    primaryGoal:  'Please describe your goal in at least 10 characters.',
    currentInjuries: 'Please describe any injuries, or write "None".',
    gymName:      'Please enter your gym name.',
  };
  return msgs[name] || 'Invalid input.';
}

/* ── Rate limiter (client-side, sessionStorage) ─────────────────
   Max 3 submissions per browser session.
   Min 45-second cooldown between attempts.                    */
const RATE = {
  MAX_PER_SESSION: 3,
  COOLDOWN_MS: 45000,
  key: 'ap_sub',
  check() {
    try {
      const raw = sessionStorage.getItem(this.key);
      const log = raw ? JSON.parse(raw) : [];
      const now = Date.now();
      const recent = log.filter(t => now - t < 60 * 60 * 1000); // last hour
      if (recent.length >= this.MAX_PER_SESSION) return { ok: false, reason: 'too_many' };
      if (recent.length > 0 && now - recent[recent.length - 1] < this.COOLDOWN_MS) {
        const wait = Math.ceil((this.COOLDOWN_MS - (now - recent[recent.length - 1])) / 1000);
        return { ok: false, reason: 'cooldown', wait };
      }
      return { ok: true };
    } catch { return { ok: true }; }
  },
  record() {
    try {
      const raw = sessionStorage.getItem(this.key);
      const log = raw ? JSON.parse(raw) : [];
      log.push(Date.now());
      sessionStorage.setItem(this.key, JSON.stringify(log.slice(-10)));
    } catch {}
  },
};

/* ============================================================
   DOM READY
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // ── Active nav link ──────────────────────────────────────
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a, .nav__mobile a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ── Mobile hamburger ─────────────────────────────────────
  const hamburger  = document.querySelector('.nav__hamburger');
  const mobileMenu = document.querySelector('.nav__mobile');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ── Scroll-fade-in ───────────────────────────────────────
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const siblings = [...entry.target.parentElement.querySelectorAll('.fade-up:not(.visible)')];
          const delay = siblings.indexOf(entry.target) * 80;
          setTimeout(() => entry.target.classList.add('visible'), delay);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
  }

  // ── Testimonials carousel ────────────────────────────────
  const track = document.querySelector('.testimonials-track');
  const dots  = document.querySelectorAll('.carousel__dot');
  if (track && dots.length > 1) {
    let current = 0;
    const total = dots.length;
    function goTo(index) {
      current = (index + total) % total;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
    goTo(0);
    let autoplay = setInterval(() => goTo(current + 1), 5000);
    track.addEventListener('mouseenter', () => clearInterval(autoplay));
    track.addEventListener('mouseleave', () => { autoplay = setInterval(() => goTo(current + 1), 5000); });
    let startX = 0;
    track.parentElement.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    track.parentElement.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1));
    });
  }

  // ── FAQ accordion ────────────────────────────────────────
  document.querySelectorAll('.faq__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq__item');
      const answer = item.querySelector('.faq__answer');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq__item').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq__answer').style.maxHeight = '0';
      });
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // ── Client agreement toggle ──────────────────────────────
  const agreementToggle = document.querySelector('.agreement-toggle');
  const agreementBlock  = document.querySelector('.agreement-block');
  if (agreementToggle && agreementBlock) {
    agreementToggle.addEventListener('click', () => agreementBlock.classList.toggle('open'));
  }

  // ── Sign-up form ─────────────────────────────────────────
  const signupForm  = document.getElementById('signupForm');
  const confirmMsg  = document.getElementById('formConfirm');
  const submitBtn   = signupForm?.querySelector('button[type="submit"]');

  if (signupForm) {

    // Pre-select plan from URL param
    const urlPlan = new URLSearchParams(window.location.search).get('plan');
    if (urlPlan) {
      const radio = signupForm.querySelector(`input[name="membership"][value="${urlPlan}"]`);
      if (radio) radio.checked = true;
    }

    // Live validation on blur for key fields
    ['fullName','email','dob','phone','bodyweight','height','sport',
     'primaryGoal','currentInjuries','gymName','practiceHours'].forEach(id => {
      const el = signupForm.querySelector('#' + id);
      if (el) el.addEventListener('blur', () => validateField(id, el.value, el));
    });

    signupForm.addEventListener('submit', async e => {
      e.preventDefault();

      // ── 1. Honeypot check (bots fill hidden fields, humans don't)
      const honeypot = signupForm.querySelector('input[name="_gotcha"]');
      if (honeypot && honeypot.value.trim() !== '') return; // silent reject

      // ── 2. Rate limit check
      const rateCheck = RATE.check();
      if (!rateCheck.ok) {
        const msg = rateCheck.reason === 'cooldown'
          ? `Please wait ${rateCheck.wait} seconds before submitting again.`
          : 'Too many submissions. Please contact alan@atkinsperformance.com directly.';
        alert(msg);
        return;
      }

      // ── 3. Validate and sanitize all fields
      const fields = [
        'fullName','email','dob','phone','bodyweight','height',
        'sport','primaryGoal','currentInjuries','gymName','practiceHours'
      ];
      let valid = true;
      fields.forEach(id => {
        const el = signupForm.querySelector('#' + id);
        if (el && !validateField(id, el.value, el)) valid = false;
      });
      if (!valid) return;

      // ── 4. Agreement checkbox
      const agreed = signupForm.querySelector('#clientAgreement');
      if (agreed && !agreed.checked) {
        agreed.setCustomValidity('Please read and accept the coaching agreement to continue.');
        agreed.reportValidity();
        return;
      }
      if (agreed) agreed.setCustomValidity('');

      // ── 5. Membership selection
      const membershipInput = signupForm.querySelector('input[name="membership"]:checked');
      if (!membershipInput) {
        const firstRadio = signupForm.querySelector('input[name="membership"]');
        if (firstRadio) {
          firstRadio.setCustomValidity('Please select a membership plan.');
          firstRadio.reportValidity();
        }
        return;
      }
      const plan  = membershipInput.value;
      const email = sanitize(signupForm.querySelector('#email')?.value || '', 254);
      const name  = sanitize(signupForm.querySelector('#fullName')?.value || '', 80);

      // ── 6. Disable submit button to prevent double-submit
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
      }

      // ── 7. Send to Web3Forms (sanitized data)
      try {
        const raw     = new FormData(signupForm);
        const clean   = new FormData();

        // Sanitize every text value before sending
        for (const [key, value] of raw.entries()) {
          if (typeof value === 'string') {
            clean.append(key, sanitize(value, 1000));
          } else {
            clean.append(key, value); // file inputs pass through
          }
        }

        clean.set('access_key', W3F_KEY);
        clean.set('subject', 'New Sign-Up: ' + name + ' — Atkins Performance');
        clean.set('from_name', 'Atkins Performance');

        // Auto-reply to client
        if (email) {
          clean.set('replyto', email);
          clean.set('autoresponse', 'true');
          clean.set('autoresponse_subject', "You're signed up — Atkins Performance");
          clean.set('autoresponse_message',
            'Hi ' + (name.split(' ')[0] || 'there') + ',\n\n' +
            'Thanks for signing up to Atkins Performance. Your intake form has been received.\n\n' +
            "Here's what happens next:\n\n" +
            '1. Complete your payment (if you haven\'t already) using the link you were just taken to.\n' +
            '2. Alan will be in touch within 24 hours on WhatsApp to confirm your details.\n' +
            '3. You\'ll receive a link to set up your TrainHeroic account.\n' +
            '4. Your first week\'s programme will be live and ready to go.\n\n' +
            'If you have any questions, reply to this email or message alan@atkinsperformance.com.\n\n' +
            'Alan Atkins\n' +
            'Atkins Performance\n' +
            'atkinsperformance.com'
          );
        }

        RATE.record(); // log submission timestamp

        await fetch('https://api.web3forms.com/submit', { method: 'POST', body: clean });

        // Send confirmation email to client via EmailJS
        if (email && typeof emailjs !== 'undefined') {
          await emailjs.send(EJS.serviceId, EJS.templateId, {
            email:      email,
            first_name: name.split(' ')[0] || 'there',
            full_name:  name,
            plan:       plan,
          });
        }
      } catch (err) {
        // Silent fail — still redirect to Stripe
      }

      // ── 8. Redirect to Stripe
      const baseUrl = STRIPE_LINKS[plan] && !STRIPE_LINKS[plan].includes('REPLACE')
        ? STRIPE_LINKS[plan]
        : null;

      if (baseUrl) {
        window.location.href = email
          ? baseUrl + '?prefilled_email=' + encodeURIComponent(email)
          : baseUrl;
      } else {
        if (confirmMsg) {
          signupForm.style.display = 'none';
          confirmMsg.style.display = 'block';
          window.scrollTo({ top: confirmMsg.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign Up';
        }
      }
    });
  }

  // ── Smooth anchor scroll ─────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Nav: add slight bg on scroll ────────────────────────
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.style.borderBottomColor = window.scrollY > 20
        ? 'rgba(255,255,255,.1)'
        : 'rgba(255,255,255,.06)';
    }, { passive: true });
  }

});
