const menuButton = document.querySelector('[data-menu-button]');
const navigation = document.querySelector('[data-navigation]');

function closeMenu({ restoreFocus = false } = {}) {
  if (!menuButton || !navigation) return;
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.querySelector('[data-menu-icon]').textContent = 'Menu';
  menuButton.querySelector('.sr-only').textContent = 'Open navigation';
  if (restoreFocus) menuButton.focus();
}

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    navigation.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.querySelector('[data-menu-icon]').textContent = open ? 'Close' : 'Menu';
    menuButton.querySelector('.sr-only').textContent = open ? 'Close navigation' : 'Open navigation';
    if (open) navigation.querySelector('a')?.focus();
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navigation.classList.contains('open')) closeMenu({ restoreFocus: true });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu();
  });
}

const billingSwitch = document.querySelector('[data-billing-switch]');
const pricingStatus = document.querySelector('[data-pricing-status]');

if (billingSwitch) {
  billingSwitch.addEventListener('click', () => {
    const annual = billingSwitch.getAttribute('aria-checked') !== 'true';
    billingSwitch.setAttribute('aria-checked', String(annual));
    document.querySelectorAll('.plan-price').forEach((price) => {
      price.querySelector('strong').textContent = annual ? price.dataset.annual : price.dataset.monthly;
    });
    document.querySelectorAll('[data-billing-copy]').forEach((copy, index) => {
      if (index === 1) {
        copy.textContent = annual ? 'Billed annually, plus a $350 one-time setup fee.' : 'Plus a clearly stated $350 one-time setup fee.';
      } else {
        copy.textContent = annual ? 'Billed annually. Equivalent monthly price shown.' : 'Pay month to month.';
      }
    });
    if (pricingStatus) pricingStatus.textContent = annual ? 'Annual equivalent prices shown.' : 'Monthly prices shown.';
  });
}

const form = document.querySelector('[data-access-form]');
const formShell = document.querySelector('[data-form-shell]');
const sourceField = document.querySelector('[data-source-field]');
const planField = document.querySelector('[data-plan-field]');

document.querySelectorAll('[data-source], [data-plan]').forEach((link) => {
  link.addEventListener('click', () => {
    if (sourceField && link.dataset.source) sourceField.value = link.dataset.source;
    if (planField && link.dataset.plan) planField.value = link.dataset.plan;
    window.setTimeout(() => {
      if (link.dataset.plan) planField?.focus();
      else document.querySelector('#name')?.focus();
    }, 350);
  });
});

const messages = {
  name: 'Enter your full name.',
  email: 'Enter a valid work email address.',
  company: 'Enter your company name.',
  plan: 'Choose the plan you are interested in.',
  consent: 'Please confirm that you read the Privacy Notice and agree to contact.'
};

function setFieldError(field, message = '') {
  const error = form?.querySelector(`[data-error-for="${field.id}"]`);
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (error) error.textContent = message;
}

function validateField(field) {
  if (!field.validity.valid) {
    setFieldError(field, messages[field.id] || field.validationMessage);
    return false;
  }
  setFieldError(field);
  return true;
}

if (form && formShell) {
  const requiredFields = [...form.querySelectorAll('[required]')];
  requiredFields.forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
    });
    field.addEventListener('change', () => validateField(field));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const summary = form.querySelector('[data-form-error]');
    const invalidFields = requiredFields.filter((field) => !validateField(field));
    if (invalidFields.length) {
      summary.textContent = `Please correct ${invalidFields.length} highlighted ${invalidFields.length === 1 ? 'field' : 'fields'}.`;
      summary.classList.add('visible');
      summary.focus();
      return;
    }

    summary.textContent = '';
    summary.classList.remove('visible');
    form.querySelector('[data-submitted-at]').value = new Date().toISOString();
    const submitButton = form.querySelector('[data-submit-button]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending request…';

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      });
      if (!response.ok) throw new Error('Submission failed');
      form.hidden = true;
      const success = formShell.querySelector('[data-form-success]');
      success.hidden = false;
      success.focus();
    } catch {
      summary.textContent = 'The request could not be sent. Please check your connection and try again.';
      summary.classList.add('visible');
      summary.focus();
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });
}
