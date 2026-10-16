// Keep the guide footer in sync with the public site.
import {siteFooter} from './site-footer.ts';
export function styleGuideFooter(){return siteFooter().replace('id="site-footer"','id="guide-footer"');}
