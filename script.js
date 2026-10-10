// Globe animation in the Approach section (lottie-web is loaded in index.html)
const globeContainer = document.getElementById('approach-globe');

if (globeContainer && window.lottie) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  lottie.loadAnimation({
    container: globeContainer,
    renderer: 'svg',
    loop: true,
    autoplay: !reduceMotion,
    path: 'assets/approach/globe.json',
  });
}
// Mobile navigation: burger button opens and closes the dropdown
const header = document.querySelector('header');
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (header && navToggle && navMenu) {
  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  navToggle.addEventListener('click', () => {
    setOpen(!header.classList.contains('is-open'));
  });

  // Close after picking a link, tapping outside, or pressing Escape
  navMenu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-open')) {
      setOpen(false);
      navToggle.focus();
    }
  });

  // Back to desktop width: make sure the menu state is reset
  window.matchMedia('(min-width: 641px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

// Spring scroll: in-page links (navbar, dropdown, hero buttons) glide to their section
// on a spring instead of jumping. It can be interrupted at any time and it is skipped
// for people who prefer reduced motion.
const SPRING_RESPONSE = 0.7;      // seconds per spring period: lower = snappier
const SPRING_MAX_OVERSHOOT = 26;  // px the page may run past its target before settling back

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const spring = { frame: 0, y: 0, velocity: 0, lastSet: 0 };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const maxScrollY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

function scrollTargetY(element) {
  const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  return clamp(element.getBoundingClientRect().top + window.scrollY - margin, 0, maxScrollY());
}

// Damping ratio that overshoots by the given fraction of the distance (0.01 = 1%)
function dampingForOvershoot(fraction) {
  const ln = Math.log(fraction);
  return -ln / Math.sqrt(Math.PI ** 2 + ln ** 2);
}

function stopSpringScroll() {
  cancelAnimationFrame(spring.frame);
  spring.frame = 0;
  spring.velocity = 0;
}

function springScrollTo(element) {
  // Short trips get a small bounce, long ones almost none, so the overshoot stays a few px
  const distance = Math.abs(scrollTargetY(element) - window.scrollY);
  const overshoot = clamp(SPRING_MAX_OVERSHOOT / Math.max(distance, 1), 0.001, 0.05);
  const omega = (2 * Math.PI) / SPRING_RESPONSE;
  const damping = 2 * dampingForOvershoot(overshoot) * omega;

  // Clicking another link mid-flight keeps position and velocity, so there is no jolt
  if (spring.frame) cancelAnimationFrame(spring.frame);
  else Object.assign(spring, { y: window.scrollY, velocity: 0, lastSet: window.scrollY });

  let previous = null;

  const step = (now) => {
    // The page moved without us (scrollbar drag, find-in-page, ...): let go
    if (Math.abs(window.scrollY - spring.lastSet) > 3) {
      stopSpringScroll();
      return;
    }

    const goal = scrollTargetY(element); // read every frame: the layout can shift while we scroll
    if (previous === null) previous = now;
    const dt = clamp((now - previous) / 1000, 0, 0.05);
    previous = now;

    // Small fixed sub-steps keep the integration stable on slow frames
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      spring.velocity += (-omega * omega * (spring.y - goal) - damping * spring.velocity) * h;
      spring.y += spring.velocity * h;
    }

    // The page can't scroll past its ends
    const max = maxScrollY();
    if (spring.y < 0 || spring.y > max) {
      spring.y = clamp(spring.y, 0, max);
      spring.velocity = 0;
    }

    const settled = Math.abs(spring.y - goal) < 0.4 && Math.abs(spring.velocity) < 8;
    window.scrollTo(0, settled ? goal : spring.y);
    spring.lastSet = window.scrollY;

    if (settled) {
      stopSpringScroll();
      return;
    }
    spring.frame = requestAnimationFrame(step);
  };

  spring.frame = requestAnimationFrame(step);
}

// Touching, scrolling or pressing a key always takes over from the glide
['wheel', 'touchstart', 'keydown'].forEach((type) => {
  window.addEventListener(type, stopSpringScroll, { passive: true });
});

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest('a[href^="#"]');
  if (!link || link.target) return;

  const section = link.hash.length > 1 && document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (!section) return; // "#" or an id that doesn't exist: leave the link alone
  if (prefersReducedMotion.matches) return; // let the browser jump

  event.preventDefault();
  if (window.location.hash !== link.hash) history.pushState(null, '', link.hash);
  springScrollTo(section);

  // Move focus along with the view, for keyboard and screen reader users
  section.setAttribute('tabindex', '-1');
  section.focus({ preventScroll: true });
});