(() => {
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('#navlinks');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(isOpen));
      menu.textContent = isOpen ? '×' : '☰';
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.textContent = '☰';
    }));
  }
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
  const form = document.querySelector('#enquiryForm');
  if (form) form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const subject = encodeURIComponent('Website Enquiry – AP Enterprises');
    const body = encodeURIComponent(
      `Hello AP Enterprises,\n\nI would like to enquire about your solutions.\n\nName: ${data.get('name')}\nPhone: ${data.get('phone')}\nCompany / Community: ${data.get('company') || 'Not provided'}\nRequirement: ${data.get('interest')}\nDetails: ${data.get('message') || 'Not provided'}\n\nRegards,\n${data.get('name')}`
    );
    window.location.href = `mailto:apentglobal@gmail.com?subject=${subject}&body=${body}`;
  });
})();