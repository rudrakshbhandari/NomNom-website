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
})();
