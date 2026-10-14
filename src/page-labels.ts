// Approved English labels for the public page introduction and style guide.
export const pageEnglishLabels:Record<string,string>={
 '/company/greeting':'Greetings','/company/about':'Company Overview','/company/certifications':'Certifications','/company/location':'Location',
 '/business':'Business','/business/cooling-tower-installation':'Cooling Tower Installation','/business/cooling-tower-repair':'Cooling Tower Repair','/business/factory-piping':'Factory Piping','/business/cooling-system':'Cooling Systems',
 '/products':'Products','/projects':'Projects','/resources':'Resources','/notices':'News','/support/as':'After-sales Service','/privacy':'Privacy Policy','/inquiries':'Contact','/my-inquiries':'My Inquiries','/style-guide':'Style Guide'
};
export function pageEnglishLabel(path:string){return pageEnglishLabels[path]||(['/products/','/projects/','/resources/','/notices/'].find(prefix=>path.startsWith(prefix))?pageEnglishLabels['/'+path.split('/')[1]]:'Information');}
