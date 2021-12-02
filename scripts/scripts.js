const envs = {
  stage: {
      ims: 'stg1',
      adminconsole: 'stage.adminconsole.adobe.com',
      account: 'stage.account.adobe.com',
      target: false,
  },
  prod: {
      ims: 'prod',
      adminconsole: 'adminconsole.adobe.com',
      account: 'account.adobe.com',
      target: true,
  },
};

/**
 * Get the current Helix environment
 * @returns {Object} the env object
 */
export function getEnv() {
  let envName = sessionStorage.getItem('helix-env');
  if (!envName) envName = 'prod';
  const env = envs[envName];
  if (env) {
      env.name = envName;
  }
  return env;
}

export function makeLinkRelative(href) {
  const url = new URL(href);
  const host = url.hostname;
  if (host.endsWith('.page') || host.endsWith('.live') || host === 'gnav.adobe.com') return (`${url.pathname}${url.search}${url.hash}`);
  return (href);
}


/**
 * Retrieves the content of a metadata tag.
 * @param {string} name The metadata name (or property)
 * @returns {string} The metadata value
 */
export function getMetadata(name) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = [...document.head.querySelectorAll(`meta[${attr}="${name}"]`)].map((el) => el.content).join(', ');
  return meta;
}

export function setSVG(anchor) {
  const { href, textContent } = anchor;
  const ext = textContent.substr(textContent.lastIndexOf('.') + 1);
  if (ext !== 'svg') return;
  const img = document.createElement('img');
  img.src = textContent;
  if (textContent === href) {
    anchor.parentElement.append(img);
    anchor.remove();
  } else {
    anchor.textContent = '';
    anchor.append(img);
  }
}

export function decorateAnchors(element) {
  const anchors = element.getElementsByTagName('a');
  return Array.from(anchors).map((anchor) => {
    anchor.href = makeLinkRelative(anchor.href);
    setSVG(anchor);
    return anchor;
  });
}

export function loadStyle(href, callback) {
  if (!document.querySelector(`head > link[href="${href}"]`)) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', href);
    link.onload = () => { if (callback) callback(); };
    link.onerror = () => { if (callback) callback(); };
    document.head.append(link);
  } else if (callback) callback();
}

export function loadScript(url, callback, type) {
  const head = document.querySelector('head');
  const script = document.createElement('script');
  script.setAttribute('src', url);
  if (type) {
    script.setAttribute('type', type);
  }
  script.onload = () => { if (callback) callback(); };
  script.onerror = () => { if (callback) callback(); };
  head.append(script);
  return script;
}

/**
 * Clean up variant classes
 * Ex: marquee--small--contained- -> marquee small contained
 * @param {HTMLElement} parent
 */
export function cleanVariations(parent) {
  const variantBlocks = parent.querySelectorAll('[class$="-"]');
  return Array.from(variantBlocks).map((variant) => {
    const { className } = variant;
    const classNameClipped = className.slice(0, -1);
    variant.classList.remove(className);
    const classNames = classNameClipped.split('--');
    variant.classList.add(...classNames);
    return variant;
  });
}

/**
 * Loads JS and CSS for a block.
 * @param {Element} block The block element
 */
export async function loadBlock(block, eager = false) {
  if (!block.getAttribute('data-block-status')) {
    block.setAttribute('data-block-status', 'loading');
    const blockName = block.getAttribute('data-block-name');
    try {
      const cssLoaded = new Promise((resolve) => {
        loadStyle(`/blocks/${blockName}/${blockName}.css`, resolve);
      });
      const decorationComplete = new Promise((resolve) => {
        const runBlock = async () => {
          const mod = await import(`/blocks/${blockName}/${blockName}.js`);
          if (mod.default) {
            await mod.default(block, blockName, document, eager);
          }
          resolve();
        };
        runBlock();
      });
      await Promise.all([cssLoaded, decorationComplete]);
    } catch (err) {
      debug(`failed to load module for ${blockName}`, err);
    }
    block.setAttribute('data-block-status', 'loaded');
    block.classList.add('block-visible');
  }
}

/**
 * Loads JS and CSS for all blocks in a container element.
 * @param {Element} main The container element
 */
async function loadBlocks(el) {
  el.querySelectorAll('.block, header')
    .forEach(async (block) => loadBlock(block));
}

function loadLazy() {
  const header = document.querySelector('header');
  header.setAttribute('data-block-name', 'header');

  const footer = document.querySelector('footer');
  footer.setAttribute('data-block-name', 'footer');
}

loadStyle('/fonts/fonts.css');
loadLazy();
loadBlocks(document.body);