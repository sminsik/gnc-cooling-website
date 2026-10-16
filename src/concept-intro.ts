import {escapeHtml as e} from './html-utils.ts';
export function conceptIntro(label:string,lines:string[],description:string,image:string,alt:string){
 return `<section class="concept-intro"><div class="concept-intro-copy"><p class="eyebrow">${e(label)}</p><h2>${lines.map(e).join('<br>')}</h2><p class="concept-intro-description">${e(description)}</p></div><figure class="concept-intro-art"><img src="${e(image)}" alt="${e(alt)}" width="1536" height="1024"></figure></section>`;
}
