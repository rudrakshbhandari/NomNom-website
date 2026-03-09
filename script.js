/**
 * NomNom Landing Page – Minimal JS
 * Handles: mobile nav toggle, smooth scroll for anchor links
 */

(function () {
  'use strict';

  const nav = document.querySelector('.nav');
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelectorAll('.nav-menu a');

  // Mobile menu toggle
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      nav.classList.toggle('nav-open');
      menuToggle.setAttribute('aria-expanded', nav.classList.contains('nav-open'));
    });
  }

  // Close mobile menu when a nav link is clicked
  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (nav && window.innerWidth < 769) {
        nav.classList.remove('nav-open');
      }
    });
  });

  // Earn section: scroll-triggered animations + number counter
  var earnSection = document.querySelector('.section-earn');
  var earnValue = document.querySelector('.earn-example-value[data-count]');
  if (earnSection && earnValue) {
    var countTarget = parseInt(earnValue.getAttribute('data-count') || '4', 10);
    var counted = false;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            earnSection.classList.add('earn-visible');
            if (!counted) {
              counted = true;
              var start = 0;
              var duration = 1200;
              var startTime = null;
              function step(t) {
                if (!startTime) startTime = t;
                var elapsed = t - startTime;
                var progress = Math.min(elapsed / duration, 1);
                progress = 1 - Math.pow(1 - progress, 2);
                var val = Math.round(progress * countTarget);
                earnValue.textContent = val;
                if (progress < 1) requestAnimationFrame(step);
              }
              requestAnimationFrame(step);
            }
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(earnSection);
  }
})();
