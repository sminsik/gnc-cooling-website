import {createRoot} from 'react-dom/client';
import FlipCard from './tween/flip-card';
const mount=document.querySelector<HTMLElement>('#home-flip-products');
if(mount){
 try{
  const products=JSON.parse(mount.dataset.products||'[]') as {id:string;name:string;intro:string;category_name:string;image_id:string;image_alt:string;display_image?:string;display_alt?:string}[];
  if(products.length)createRoot(mount).render(<div className="home-flip-grid">{products.map(p=><FlipCard key={p.id} title={p.name} eyebrow={p.category_name} subtitle="제품 설명 보기" description={p.intro} image={p.display_image||'/api/product-images/'+encodeURIComponent(p.image_id)} imageAlt={p.display_alt||p.image_alt} href={'/products/'+encodeURIComponent(p.id)} ctaText="제품 상세 보기" aria-label={p.name+' 설명 전환'}/>)}</div>);
 }catch{/* The server-rendered product links remain available. */}
}
