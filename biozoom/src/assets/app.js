// Progressive enhancements only: all content and destination links exist in HTML.
document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.primary-nav');
const submenuButton = document.querySelector('.submenu-toggle');
const submenu = document.getElementById('technology-menu');
function closeSubmenu(){if(submenuButton&&submenu){submenuButton.setAttribute('aria-expanded','false');submenu.hidden=true;}}
function closeMenu(){if(menuButton&&nav){menuButton.setAttribute('aria-expanded','false');nav.classList.remove('is-open');}closeSubmenu();}
menuButton?.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);if(!open)closeSubmenu();});
submenuButton?.addEventListener('click',()=>{const open=submenuButton.getAttribute('aria-expanded')!=='true';submenuButton.setAttribute('aria-expanded',String(open));submenu.hidden=!open;});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(submenu&&!submenu.hidden){closeSubmenu();submenuButton.focus();}else if(nav?.classList.contains('is-open')){closeMenu();menuButton.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();else if(!event.target.closest('.nav-technology'))closeSubmenu();});
document.querySelector('.site-header')?.addEventListener('focusout',event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget))closeMenu();});
nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
matchMedia('(min-width: 961px)').addEventListener('change',closeMenu);

const filters=[...document.querySelectorAll('[data-tech-filter]')];
const technologyItems=[...document.querySelectorAll('[data-tech-category]')];
const filterStatus=document.querySelector('[data-tech-filter-status]');
if(filters.length&&technologyItems.length){
 document.querySelector('.technology-filter').hidden=false;
 if(filterStatus)filterStatus.hidden=false;
 const filterTechnologies=(category)=>{
  let count=0;
  technologyItems.forEach(item=>{const shown=category==='all'||item.dataset.techCategory.split(' ').includes(category);item.hidden=!shown;if(shown)count++;});
  filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.techFilter===category)));
  if(filterStatus)filterStatus.textContent=`${count} ${count===1?'technology':'technologies'} shown`;
 };
 filters.forEach(button=>button.addEventListener('click',()=>filterTechnologies(button.dataset.techFilter)));
 filterTechnologies('all');
}

const form=document.getElementById('inquiry-form');
if(form){
 const status=document.getElementById('form-status');
 const interest=new URLSearchParams(location.search).get('interest');
 if(interest&&[...form.elements.interest.options].some(option=>option.value===interest))form.elements.interest.value=interest;
 const rules={name:value=>value.trim()?'':'Please enter your full name.',email:value=>!value.trim()?'Please enter your work email.':/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())?'':'Please enter a valid email address.',message:value=>value.trim()?'':'Please describe your project needs.'};
 function validate(id){const field=form.elements[id];const error=rules[id](field.value);field.setAttribute('aria-invalid',String(!!error));document.getElementById(`${id}-error`).textContent=error;return !error;}
 for(const id of Object.keys(rules))form.elements[id].addEventListener('input',()=>{if(form.elements[id].hasAttribute('aria-invalid'))validate(id);status.textContent='';});
 function reviewInquiry(){const invalid=Object.keys(rules).filter(id=>!validate(id));if(invalid.length){status.textContent='Please complete the required fields. Your inquiry has not been sent or saved.';form.elements[invalid[0]].focus();return;}status.textContent='Your project brief is ready to review. This is a demonstration: nothing has been sent or saved. Please contact BIOZOOM using the email or phone listed on this page.';status.focus();}
 // A non-submit button keeps the local demo inert if this script fails to load.
 // Multiple text fields block native implicit submission; unnamed controls also
 // keep personal values out of a native form entry list. IDs support local validation.
 form.querySelector('[data-review-inquiry]')?.addEventListener('click',reviewInquiry);
 form.addEventListener('submit',event=>{event.preventDefault();reviewInquiry();});
 form.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing&&event.target.matches('input')){event.preventDefault();reviewInquiry();}});
}

// Restrained scroll reveal for content below the first screen. Above-the-fold content is never hidden,
// and nothing is hidden when reduced motion is requested or IntersectionObserver is unavailable.
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const revealTargets=[...document.querySelectorAll('main section h2,.solution-card,.project-capability,.equipment-card,.service-item,.tech-list-item,.fact-grid article,.faq-list details,.feature-image,.company-photo,.brief-list li,.related-links a')].filter(el=>el.getBoundingClientRect().top>innerHeight);
 const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}}),{rootMargin:'0px 0px -6% 0px'});
 revealTargets.forEach(el=>{el.classList.add('reveal');revealObserver.observe(el);});
}
