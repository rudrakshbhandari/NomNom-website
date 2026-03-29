(function () {
  const config = window.NOMNOM_LEGAL_CONFIG;

  if (!config) {
    return;
  }

  const byId = (id) => document.getElementById(id);
  const byRepeatedId = (id) => document.querySelectorAll(`[id="${id}"]`);

  const setText = (id, value) => {
    byRepeatedId(id).forEach((node) => {
      node.textContent = value;
    });
  };

  setText("legal-version", config.legalVersion);
  setText("effective-date", config.effectiveDate);
  setText("company-name", config.company.legalName);
  setText("support-email", config.company.supportEmail);
  setText("copyright-year", String(new Date().getFullYear()));
  setText("affiliation-disclaimer", config.affiliationDisclaimer);

  document.querySelectorAll('[id="support-link"]').forEach((supportAnchor) => {
    supportAnchor.href = config.company.supportUrl;
    supportAnchor.textContent = config.company.supportEmail;
  });

  const footer = byId("legal-footer-links");
  if (footer && footer.children.length === 0) {
    const links = [
      ["Home", config.links.home],
      ["Privacy", config.links.privacy],
      ["Terms", config.links.terms],
      ["Rider Terms", config.links.riderTerms],
      ["Refunds", config.links.refunds],
      ["California Privacy", config.links.californiaPrivacy]
    ];

    links.forEach(([label, href]) => {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = label;
      footer.appendChild(a);
    });
  }
})();
