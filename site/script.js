// SELMA Blaze Cap — minimal interactions: nav state, scroll reveals, stat count-up.
(() => {
  const nav = document.getElementById("nav");

  // nav background once you scroll past the hero top
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // mobile nav: hamburger toggles the dropdown menu
  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  if (navToggle && mobileMenu) {
    const setOpen = (open) => {
      mobileMenu.classList.toggle("open", open);
      navToggle.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
    };
    navToggle.addEventListener("click", () => setOpen(!mobileMenu.classList.contains("open")));
    // close after picking a destination, on Escape, and if the window grows back to desktop
    mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    window.addEventListener("resize", () => { if (window.innerWidth > 900) setOpen(false); });
  }

  // reveal-on-scroll
  const reveals = document.querySelectorAll(".reveal");
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          revealIO.unobserve(e.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );
  reveals.forEach((el) => revealIO.observe(el));

  // animated counters
  const fmt = (n, decimals) =>
    decimals
      ? n.toFixed(decimals)
      : Math.round(n).toLocaleString("en-IN");

  const runCount = (el) => {
    const target = parseFloat(el.dataset.count);
    if (Number.isNaN(target)) return; // static (non-numeric) stat like "TOP" — leave as-is
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const dur = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = fmt(target * eased, decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target, decimals) + suffix;
    };
    requestAnimationFrame(tick);
  };

  const countIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          runCount(e.target);
          countIO.unobserve(e.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll(".stat-num").forEach((el) => countIO.observe(el));

  // subtle hero parallax on the helmet (desktop only)
  const helmet = document.querySelector(".hero-helmet");
  if (helmet && window.matchMedia("(min-width: 1081px)").matches) {
    window.addEventListener(
      "scroll",
      () => {
        const y = Math.min(window.scrollY, 600);
        helmet.style.transform = `translateY(calc(-100% + ${y * 0.06}px))`;
      },
      { passive: true }
    );
  }
})();
