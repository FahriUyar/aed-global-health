import { useEffect } from 'react';

const APP = 'AED Global Toumai® Saha CRM';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Her route için dinamik <title>, description, Open Graph ve Twitter Card etiketleri */
export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    const full = `${title} | ${APP}`;
    document.title = full;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', window.location.href);
    setMeta('name', 'twitter:title', full);
    setMeta('name', 'twitter:description', description);
  }, [title, description]);
}
