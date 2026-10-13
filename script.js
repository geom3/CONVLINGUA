(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  /* Approach globe (lottie-web is loaded in index.html) */
  function initGlobe() {
    const container = document.getElementById("approach-globe");
    if (!container || !window.lottie) return;

    window.lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: true,
      autoplay: !reducedMotion.matches,
      path: "assets/approach/globe.json",
    });
  }

  /* Mobile navigation */
  function initNav() {
    const header = document.querySelector("header");
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.getElementById("nav-menu");
    if (!header || !toggle || !menu) return;

    const isOpen = () => header.classList.contains("is-open");
    const setOpen = (open) => {
      header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    toggle.addEventListener("click", () => setOpen(!isOpen()));

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.matchMedia("(min-width: 641px)").addEventListener("change", (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* Spring scroll for in-page links; interruptible, skipped for reduced motion */
  function initSpringScroll() {
    const RESPONSE = 0.7; // seconds per spring period (lower = snappier)
    const MAX_OVERSHOOT = 26; // px the page may run past its target
    const spring = { frame: 0, y: 0, velocity: 0, lastSet: 0 };

    const maxScrollY = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const targetY = (element) => {
      const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
      return clamp(
        element.getBoundingClientRect().top + window.scrollY - margin,
        0,
        maxScrollY(),
      );
    };

    // Damping ratio that overshoots by the given fraction of the distance
    const dampingForOvershoot = (fraction) => {
      const ln = Math.log(fraction);
      return -ln / Math.sqrt(Math.PI ** 2 + ln ** 2);
    };

    const stop = () => {
      cancelAnimationFrame(spring.frame);
      spring.frame = 0;
      spring.velocity = 0;
    };

    const scrollTo = (element) => {
      const distance = Math.abs(targetY(element) - window.scrollY);
      const overshoot = clamp(MAX_OVERSHOOT / Math.max(distance, 1), 0.001, 0.05);
      const omega = (2 * Math.PI) / RESPONSE;
      const damping = 2 * dampingForOvershoot(overshoot) * omega;

      // Re-targeting mid-flight keeps position and velocity
      if (spring.frame) cancelAnimationFrame(spring.frame);
      else Object.assign(spring, { y: window.scrollY, velocity: 0, lastSet: window.scrollY });

      let previous = null;

      const step = (now) => {
        // The page moved without us (scrollbar drag, find-in-page): let go
        if (Math.abs(window.scrollY - spring.lastSet) > 3) {
          stop();
          return;
        }

        const goal = targetY(element); // layout can shift while scrolling
        if (previous === null) previous = now;
        const dt = clamp((now - previous) / 1000, 0, 0.05);
        previous = now;

        // Fixed sub-steps keep the integration stable on slow frames
        const steps = Math.max(1, Math.ceil(dt * 240));
        const h = dt / steps;
        for (let i = 0; i < steps; i += 1) {
          spring.velocity += (-omega * omega * (spring.y - goal) - damping * spring.velocity) * h;
          spring.y += spring.velocity * h;
        }

        const max = maxScrollY();
        if (spring.y < 0 || spring.y > max) {
          spring.y = clamp(spring.y, 0, max);
          spring.velocity = 0;
        }

        const settled = Math.abs(spring.y - goal) < 0.4 && Math.abs(spring.velocity) < 8;
        window.scrollTo(0, settled ? goal : spring.y);
        spring.lastSet = window.scrollY;

        if (settled) stop();
        else spring.frame = requestAnimationFrame(step);
      };

      spring.frame = requestAnimationFrame(step);
    };

    ["wheel", "touchstart", "keydown"].forEach((type) => {
      window.addEventListener(type, stop, { passive: true });
    });

    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = event.target.closest('a[href^="#"]');
      if (!link || link.target) return;

      const section =
        link.hash.length > 1 && document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (!section || reducedMotion.matches) return;

      event.preventDefault();
      if (window.location.hash !== link.hash) history.pushState(null, "", link.hash);
      scrollTo(section);

      // Move focus along with the view for keyboard and screen reader users
      section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
    });
  }

  /*
   * Single-column capabilities: scale the circuit line (phone_lines.svg) evenly so each
   * of its five nodes sits beside a title. --s drives its size in the CSS.
   */
  function initCircuitLine() {
    const line = document.querySelector(".capabilities-lines-phone");
    const steps = document.querySelector(".capabilities-steps");
    const list = steps && steps.querySelector(".capabilities-list");
    if (!line || !list) return;

    const NODE_Y = [107.56, 209.88, 320.06, 416.1, 497.19]; // node centres in the svg
    const LINE_TOP = 58;
    const LINE_BOTTOM = 536;
    const TITLE_MIDDLE = 11; // middle of a title's first line (22px line-height)
    const lastNode = NODE_Y.length - 1;

    const fit = (pass = 0) => {
      if (getComputedStyle(line).display === "none") return;

      const items = [...list.children];
      if (items.length !== NODE_Y.length) return;

      // Measure natural item heights without extra spacing
      items.forEach((item) => {
        item.style.marginTop = "0px";
      });
      steps.style.paddingTop = "0px";
      steps.style.paddingBottom = "0px";
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const heights = items.map((item) => item.getBoundingClientRect().height);

      // Smallest scale where every item fits between its node and the next
      let scale = 1.2;
      for (let i = 0; i < lastNode; i += 1) {
        scale = Math.max(scale, (heights[i] + gap) / (NODE_Y[i + 1] - NODE_Y[i]));
      }

      items.forEach((item, i) => {
        if (i === 0) return;
        const extra = scale * (NODE_Y[i] - NODE_Y[i - 1]) - heights[i - 1] - gap;
        item.style.marginTop = `${Math.max(0, extra)}px`;
      });

      const lineTop = 4 - scale * LINE_TOP;
      const firstTitle = scale * NODE_Y[0] + lineTop - TITLE_MIDDLE;
      const bottomRoom = scale * (LINE_BOTTOM - NODE_Y[lastNode]) + TITLE_MIDDLE;

      const previous = parseFloat(steps.style.getPropertyValue("--s")) || 1.4;
      steps.style.setProperty("--s", scale.toFixed(3));
      steps.style.paddingTop = `${firstTitle}px`;
      steps.style.paddingBottom = `${Math.max(0, bottomRoom - heights[lastNode] + 4)}px`;
      line.style.top = `${lineTop}px`;

      // The scale sets the list's left padding, which can re-wrap text: settle again
      if (pass < 3 && Math.abs(scale - previous) > 0.005) fit(pass + 1);
    };

    let queued = 0;
    const refit = () => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => fit());
    };

    fit();
    window.addEventListener("resize", refit);
    window.addEventListener("load", refit);
    document.fonts?.ready.then(refit);
  }

  initGlobe();
  initNav();
  initSpringScroll();
  initCircuitLine();
})();