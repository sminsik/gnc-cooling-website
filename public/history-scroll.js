(() => {
  const display = document.querySelector('[data-history-year]');
  const message = document.querySelector('.history-sidebar [data-history-message]');
  const rows = [...document.querySelectorAll('.history-year')];
  if (!display || !rows.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = display.textContent.trim();
  let pending = false;
  let animation;
  let messageAnimation;
  function update() {
    pending = false;
    // Select the year that has reached the reading line below the fixed header.
    const readingLine = Math.max(150, Math.min(innerHeight * .32, 280));
    let active = rows[0];
    for (const row of rows) {
      if (row.getBoundingClientRect().top <= readingLine) active = row;
      else break;
    }
    const year = active.querySelector('h3').textContent.trim();
    for (const row of rows) row.classList.toggle('is-current', row === active);
    if (year === current) return;
    current = year;
    messageAnimation?.cancel();
    if (message) {
      message.textContent = active.dataset.historyMessage || '';
      if (!reduced.matches && message.animate) {
        messageAnimation = message.animate([
          {opacity: 0, transform: 'translateY(8px)'},
          {opacity: 1, transform: 'translateY(0)'}
        ], {duration: 420, easing: 'cubic-bezier(.22,1,.36,1)'});
      }
    }
    animation?.cancel();
    display.textContent = year;
    display.setAttribute('aria-label', `현재 연혁 ${year}년`);
    if (!reduced.matches && display.animate) {
      animation = display.animate([
        {opacity: .15, transform: 'translateY(14px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 340, easing: 'cubic-bezier(.22,1,.36,1)'});
    }
  }
  function schedule() {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule);
  addEventListener('pageshow', schedule);
  update();
})();
