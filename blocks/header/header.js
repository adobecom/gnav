import {
  loadScript,
  getEnv,
  makeLinkRelative,
  getMetadata,
  cleanVariations,
  decorateAnchors,
  loadStyle,
} from '../../scripts/scripts.js';
import createTag from './gnav-utils.js';

const COMPANY_IMG = '<img alt="Adobe" src="/img/adobe-logo.svg">';
const BRAND_IMG = '<img src="/img/brand-logo.svg">';
const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false">
<path d="M14 2A8 8 0 0 0 7.4 14.5L2.4 19.4a1.5 1.5 0 0 0 2.1 2.1L9.5 16.6A8 8 0 1 0 14 2Zm0 14.1A6.1 6.1 0 1 1 20.1 10 6.1 6.1 0 0 1 14 16.1Z"></path>
</svg>`;
const IS_OPEN = 'is-Open';

class Gnav {
  constructor(body, el) {
    this.el = el;
    this.body = body;
    this.env = getEnv();
    this.desktop = window.matchMedia('(min-width: 1200px)');
  }

  init = () => {
    this.state = {};
    this.curtain = createTag('div', { class: 'gnav-curtain' });
    const nav = createTag('nav', { class: 'gnav' });

    const mobileToggle = this.decorateToggle(nav);
    nav.append(mobileToggle);

    const brand = this.decorateBrand();
    if (brand) {
      nav.append(brand);
    }

    const mainNav = this.decorateMainNav();
    if (mainNav) {
      nav.append(mainNav);
    }

    const search = this.decorateSearch();
    if (search) {
      nav.append(search);
    }

    const profile = this.decorateProfile();
    if (profile) {
      nav.append(profile);
    }

    const logo = this.decorateLogo();
    if (logo) {
      nav.append(logo);
    }

    const wrapper = createTag('div', { class: 'gnav-wrapper' }, nav);
    this.el.append(this.curtain, wrapper);
  }

  decorateToggle = (nav) => {
    const toggle = createTag('button', { class: 'gnav-toggle', 'aria-label': 'Navigation menu', 'aria-expanded': false });
    const onMediaChange = (e) => {
      if (e.matches) {
        nav.classList.remove(IS_OPEN);
        this.curtain.classList.remove(IS_OPEN);
      }
    };
    toggle.addEventListener('click', async () => {
      if (nav.classList.contains(IS_OPEN)) {
        nav.classList.remove(IS_OPEN);
        this.curtain.classList.remove(IS_OPEN);
        this.desktop.removeEventListener('change', onMediaChange);
      } else {
        nav.classList.add(IS_OPEN);
        this.desktop.addEventListener('change', onMediaChange);
        this.curtain.classList.add(IS_OPEN);
        this.loadSearch();
      }
    });
    return toggle;
  }

  decorateBrand = () => {
    const brandBlock = this.body.querySelector('[class^="gnav-brand"]');
    if (!brandBlock) return null;
    const brand = brandBlock.querySelector('a');
    const title = createTag('span', { class: 'gnav-brand-title' }, brand.textContent);

    brand.href = makeLinkRelative(brand.href);
    brand.setAttribute('aria-label', brand.textContent);
    brand.textContent = '';
    const { className } = brandBlock;
    brand.className = className;
    if (brand.classList.contains('logo')) {
      brand.insertAdjacentHTML('afterbegin', BRAND_IMG);
    }
    brand.append(title);
    return brand;
  }

  decorateLogo = () => {
    const logo = this.body.querySelector('.adobe-logo a');
    logo.href = makeLinkRelative(logo.href);
    logo.classList.add('gnav-logo');
    logo.setAttribute('aria-label', logo.textContent);
    logo.textContent = '';
    logo.insertAdjacentHTML('afterbegin', COMPANY_IMG);
    return logo;
  }

  decorateMainNav = () => {
    const mainLinks = this.body.querySelectorAll('h2 > a');
    if (mainLinks.length > 0) {
      return this.buildMainNav(mainLinks);
    }
    return null;
  }

  buildMainNav = (navLinks) => {
    const mainNav = createTag('div', { class: 'gnav-mainnav' });
    navLinks.forEach((navLink, idx) => {
      navLink.href = makeLinkRelative(navLink.href);
      const navItem = createTag('div', { class: 'gnav-navitem' });
      const menu = navLink.closest('div');
      const largeMenuProps = {
        'navLink': navLink,
        'navItem': navItem,
        'menu': menu,
        'idx': idx,
      }

      menu.querySelector('h2').remove();
      navItem.appendChild(navLink);
      this.decorateLareMenu(largeMenuProps);
      if (menu.childElementCount > 0) {
        const id = `navmenu-${idx}`;
        const decoratedMenu = this.decorateMenu(navItem, navLink, menu);

        menu.id = id;
        navItem.classList.add('has-Menu');
        this.setNavLinkAttributes(id, navLink);
        navItem.appendChild(decoratedMenu);
      }
      mainNav.appendChild(navItem);
    });
    return mainNav;
  }

  decorateLareMenu = (largeMenuProps) => {
    const {navLink, navItem, menu, idx} = largeMenuProps;
    const sectionNavBlock = menu.closest('.large-menu.section');
    const largeMenuBlock = menu.closest('.large-menu');
    
    if (sectionNavBlock || largeMenuBlock) {
      const navBlock = sectionNavBlock || largeMenuBlock;
      let path = navBlock.querySelector(':scope > div:last-of-type > div').textContent;
      path = makeLinkRelative(path);
      const promise = fetch(`${path}.plain.html`);
      promise.then(async (resp) => {
        if (resp.status === 200) {
          const text = await resp.text();
          const sectionMenu = createTag('div', null, text);
          const id = `navmenu-${idx}`;
          const decoratedMenu = this.decorateMenu(navItem, navLink, sectionMenu);

          sectionMenu.id = id;
          if (sectionNavBlock) {
            navItem.classList.add('has-Menu', 'large-menu', 'section');
          } else {
            navItem.classList.add('has-Menu');
          }
          this.setNavLinkAttributes(id, navLink);
          this.decorateLinkGroup(sectionMenu);
          await loadStyle('/blocks/large-menu/large-menu.css');
          navItem.appendChild(decoratedMenu);
        }
      });
    }
  }

  setNavLinkAttributes = (id, navLink) => {
    navLink.setAttribute('role', 'button');
    navLink.setAttribute('aria-expanded', false);
    navLink.setAttribute('aria-controls', id);
  }

  decorateLinkGroup = (sectionMenu) => {
    const linkGroups = sectionMenu.querySelectorAll('.link-group')
    if (linkGroups.length > 0) {
      linkGroups.forEach((linkGroup, idx) => {
        const image = linkGroup.querySelector(':scope > div > div:first-of-type picture');
        const url =  linkGroup.querySelector(':scope > div > div:last-of-type p a');
        const title = linkGroup.querySelector(':scope > div > div:last-of-type p').textContent;
        const subtitle = linkGroup.querySelector(':scope > div > div:last-of-type p:last-of-type');
        const titleWrapper = createTag('div', null);
        url.href = makeLinkRelative(url.href);
        const link = createTag('a', {'class': 'link-block', 'href': url.href });

        linkGroup.replaceChildren();
        titleWrapper.append(title, subtitle);
        this.linkBlockDomCheck(image, link, titleWrapper);
        linkGroup.appendChild(link);
      });
    }
  }

  linkBlockDomCheck = (image, link, titleWrapper) => {
    if (image) {
      return link.append(image, titleWrapper);
    }
    else {
      return link.append(titleWrapper);
    }
  }

  decorateMenu = (navItem, navLink, menu) => {
    menu.className = 'gnav-navitem-menu';
    const childCount = menu.childElementCount;
    if (childCount === 1) {
      menu.classList.add('small-Variant');
    } else if (childCount === 2) {
      menu.classList.add('medium-Variant');
    } else if (childCount >= 3) {
      navItem.classList.add('large-menu');
      menu.classList.add('large-Variant');
      const container = createTag('div', { class: 'gnav-menu-container' });
      container.append(...Array.from(menu.children));
      menu.append(container);
    }
    navLink.addEventListener('focus', () => {
      window.addEventListener('keydown', this.toggleOnSpace);
    });
    navLink.addEventListener('blur', () => {
      window.removeEventListener('keydown', this.toggleOnSpace);
    });
    navLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleMenu(navItem);
    });
    return menu;
  }

  decorateSearch = () => {
    const searchBlock = this.body.querySelector('.search');
    if (searchBlock) {
      const label = searchBlock.querySelector('p').textContent;
      const advancedLink = searchBlock.querySelector('a');
      const searchEl = createTag('div', { class: 'gnav-search' });
      const searchBar = this.decorateSearchBar(label, advancedLink);
      const searchButton = createTag(
        'button',
        {
          class: 'gnav-search-button',
          'aria-label': label,
          'aria-expanded': false,
          'aria-controls': 'gnav-search-bar',
        },
        SEARCH_ICON,
      );
      searchButton.addEventListener('click', () => {
        this.loadSearch(searchEl);
        this.toggleMenu(searchEl);
      });
      searchEl.append(searchButton, searchBar);
      return searchEl;
    }
    return null;
  }

  decorateSearchBar = (label, advancedLink) => {
    const searchBar = createTag('aside', { id: 'gnav-search-bar', class: 'gnav-search-bar' });
    const searchField = createTag('div', { class: 'gnav-search-field' }, SEARCH_ICON);
    const searchInput = createTag('input', { class: 'gnav-search-input', placeholder: label });
    const searchResults = createTag('div', { class: 'gnav-search-results' });

    searchInput.addEventListener('input', (e) => {
      this.onSearchInput(e.target.value, searchResults, advancedLink);
    });

    searchField.append(searchInput, advancedLink);
    searchBar.append(searchField, searchResults);
    return searchBar;
  }

  loadSearch = async () => {
    if (this.onSearchInput) return;
    const gnavSearch = await import('./gnav-search.js');
    this.onSearchInput = gnavSearch.default;
  }

  decorateProfile = () => {
    const blockEl = this.body.querySelector('.profile');
    if (!blockEl) return null;
    const profileEl = createTag('div', { class: 'gnav-profile' });

    window.adobeid = {
      client_id: 'bizweb',
      scope: 'AdobeID,openid,gnav',
      locale: 'en_US',
      autoValidateToken: true,
      environment: this.env.ims,
      useLocalStorage: false,
      onReady: () => { this.imsReady(blockEl, profileEl); },
    };
    loadScript('https://auth.services.adobe.com/imslib/imslib.min.js');

    return profileEl;
  }

  imsReady = async (blockEl, profileEl) => {
    const accessToken = window.adobeIMS.getAccessToken();
    if (accessToken) {
      const ioResp = await fetch(`https://${this.env.adobeIO}/profile`, {
        headers: new Headers({ Authorization: `Bearer ${accessToken.token}` }),
      });
      if (ioResp.status === 200) {
        const profile = await import('./gnav-profile.js');
        profile.default(blockEl, profileEl, this.toggleMenu, ioResp);
      } else {
        this.decorateSignIn(blockEl, profileEl);
      }
    } else {
      this.decorateSignIn(blockEl, profileEl);
    }
  }

  decorateSignIn = (blockEl, profileEl) => {
    const signIn = blockEl.querySelector('a');
    signIn.classList.add('gnav-signin');
    profileEl.append(signIn);
    profileEl.addEventListener('click', (e) => {
      e.preventDefault();
      window.adobeIMS.signIn();
    });
  }

  /**
   * Toggles menus when clicked directly
   * @param {HTMLElement} el the element to check
   */
  toggleMenu = (el) => {
    const isSearch = el.classList.contains('gnav-search');
    const sameMenu = el === this.state.openMenu;
    if (this.state.openMenu) {
      this.closeMenu();
    }
    if (!sameMenu) {
      this.openMenu(el, isSearch);
    }
  }

  closeMenu = () => {
    this.state.openMenu.classList.remove(IS_OPEN);
    document.removeEventListener('click', this.closeOnDocClick);
    window.removeEventListener('keydown', this.closeOnEscape);
    const menuToggle = this.state.openMenu.querySelector('[aria-expanded]');
    menuToggle.setAttribute('aria-expanded', false);
    this.curtain.classList.remove(IS_OPEN);
    this.state.openMenu = null;
  }

  openMenu = (el, isSearch) => {
    el.classList.add(IS_OPEN);

    const menuToggle = el.querySelector('[aria-expanded]');
    menuToggle.setAttribute('aria-expanded', true);

    document.addEventListener('click', this.closeOnDocClick);
    window.addEventListener('keydown', this.closeOnEscape);
    if (!isSearch) {
      const desktop = window.matchMedia('(min-width: 1200px)');
      if (desktop.matches) {
        document.addEventListener('scroll', this.closeOnScroll, { passive: true });
      }
    } else {
      this.curtain.classList.add(IS_OPEN);
      el.querySelector('.gnav-search-input').focus();
    }
    this.state.openMenu = el;
  }

  toggleOnSpace = (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      const parentEl = e.target.closest('.has-Menu');
      this.toggleMenu(parentEl);
    }
  }

  closeOnScroll = () => {
    let scrolled;
    if (!scrolled) {
      if (this.state.openMenu) {
        this.toggleMenu(this.state.openMenu);
      }
      scrolled = true;
      document.removeEventListener('scroll', this.closeOnScroll);
    }
  }

  closeOnDocClick = (e) => {
    const closest = e.target.closest(`.${IS_OPEN}`);
    const isCurtain = e.target === this.curtain;
    if ((this.state.openMenu && !closest) || isCurtain) {
      this.toggleMenu(this.state.openMenu);
    }
  }

  closeOnEscape = (e) => {
    if (e.code === 'Escape') {
      this.toggleMenu(this.state.openMenu);
    }
  }
}

async function fetchGnav(url) {
  const resp = await fetch(`${url}.plain.html`);
  const html = await resp.text();
  return html;
}

export default async function init(blockEl) {
  const url = makeLinkRelative(getMetadata('gnav')) || '/gnav';
  const html = await fetchGnav(url);
  if (html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      cleanVariations(doc);
      decorateAnchors(doc);
      const gnav = new Gnav(doc.body, blockEl);
      gnav.init();
    } catch (e) {
      console.log('Could not great global navigation', e);
    }
  }
}
