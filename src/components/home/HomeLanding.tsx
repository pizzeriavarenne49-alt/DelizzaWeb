import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ui/ProductCard";
import HomeClient from "@/app/(site)/HomeClient";
import { BUSINESS } from "@/lib/seo";
import type { Product } from "@/types";

const craft = [
  ["01", "Le temps de la pâte", "Une maturation d’environ 24 heures au froid."],
  ["02", "À votre commande", "Des pizzas préparées à la commande, selon vos envies."],
  ["03", "Le goût du choix", "Des ingrédients sélectionnés avec soin."],
  ["04", "La juste cuisson", "Une cuisson maîtrisée à haute température."],
] as const;

export default function HomeLanding({ products }: { products: Product[] }) {
  // Use actual catalogue photography; never present mock illustrations as real products.
  const hero = products.find(p => p.active && p.image.startsWith("https://") && !p.image.includes("placeholder"));
  const address = `${BUSINESS.address.streetAddress}, La Varenne, ${BUSINESS.address.postalCode} ${BUSINESS.address.addressLocality}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  return <div className="premium-home">
    <section className="home-hero" data-seasonal-hero="" aria-labelledby="home-title">
      <div className="home-hero-copy">
        <div className="home-eyebrow"><span aria-hidden="true">✦</span> Deli&apos;Zza · La Varenne</div>
        <HomeClient />
        <h1 id="home-title">Pizzas à emporter<br />à <em>La Varenne.</em></h1>
        <p className="home-intro">Votre recette. Votre moment pizza. Des ingrédients choisis avec soin, une préparation à la commande et le plaisir de se retrouver.</p>
        <div className="home-actions"><Link href="/menu" data-home-order={hero?.id ?? "home"} className="home-button home-button-primary">Choisir mes pizzas <span aria-hidden="true">↗</span></Link><Link href="#retrait" className="home-button home-button-secondary">Préparer mon retrait</Link></div>
        <p className="home-pickup">Click &amp; collect · Retrait sur place · Sans livraison</p>
      </div>
      {hero ? <figure className="home-hero-visual">
        <Image src={hero.image} alt={`La pizza ${hero.name}, à découvrir dans la carte Deli'Zza`} fill sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1200px) 40vw, 440px" quality={60} priority fetchPriority="high" className="object-cover" />
        <figcaption><span>Dans notre carte</span><strong>{hero.name}</strong><Link href="/menu">Découvrir la recette <span aria-hidden="true">↗</span></Link></figcaption>
      </figure> : <div className="home-hero-note"><span>À chaque envie,</span><strong>sa pizza.</strong><Link href="/menu" className="home-text-link">Découvrir notre carte ↗</Link></div>}
    </section>

    {products.length > 0 && <section className="home-section" aria-labelledby="selection-title">
      <div className="home-section-heading"><div><p className="home-eyebrow">À partager. Ou pas.</p><h2 id="selection-title">La carte donne envie.</h2></div><Link href="/menu" className="home-text-link">Toute la carte <span aria-hidden="true">↗</span></Link></div>
      <div className="home-products">{products.slice(0, 4).map(product => <ProductCard key={product.id} product={product} />)}</div>
    </section>}

    <section className="home-section home-craft" aria-labelledby="craft-title">
      <div className="home-section-heading"><div><p className="home-eyebrow">Du temps. Du soin. Du goût.</p><h2 id="craft-title">La simplicité,<br />bien préparée.</h2></div><Link href="/notre-savoir-faire" className="home-text-link">Notre savoir-faire ↗</Link></div>
      <div className="home-craft-grid">{craft.map(([number,title,description]) => <div key={number}><span className="home-number" aria-hidden="true">{number}</span><h3>{title}</h3><p>{description}</p></div>)}</div>
    </section>

    <section className="home-section" aria-labelledby="order-title">
      <p className="home-eyebrow">Votre soirée, simplement</p><h2 id="order-title">On se retrouve à La Varenne.</h2>
      <ol className="home-steps">{[
        ["Choisissez", "Explorez les pizzas de notre carte."],
        ["Personnalisez", "Sélectionnez les options proposées et composez votre commande."],
        ["Prévoyez", "Choisissez parmi les créneaux disponibles lors de la commande."],
        ["Récupérez", "Retrouvez-nous au point de retrait à La Varenne."],
      ].map(([title,description],index) => <li key={title}><span aria-hidden="true">0{index+1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
    </section>

    <section id="retrait" className="home-section home-location" aria-labelledby="location-title">
      <div><p className="home-eyebrow">Votre point de rendez-vous</p><h2 id="location-title">Deli&apos;Zza,<br />tout près de vous.</h2><address>{BUSINESS.address.streetAddress}<br />La Varenne · {BUSINESS.address.postalCode} {BUSINESS.address.addressLocality}</address><p className="home-pickup">Vente à emporter et click &amp; collect. Aucune livraison.</p><div className="home-actions"><a href={directions} className="home-button home-button-secondary" rel="noreferrer">Mon itinéraire ↗</a><a href={`tel:${BUSINESS.telephone.replaceAll(" ", "")}`} className="home-text-link">{BUSINESS.telephone}</a></div></div>
      <div className="home-hours"><h3>Les horaires d&apos;hiver</h3><dl><div><dt>Lundi &amp; mardi</dt><dd>Fermé</dd></div>{BUSINESS.openingHours.map((hours,index) => <div key={hours.opens+hours.closes}><dt>{index===0?"Mercredi & jeudi":"Vendredi, samedi & dimanche"}</dt><dd>{hours.opens.replace(":", " h ")} – {hours.closes.replace(":", " h ")}</dd></div>)}</dl><p>Les créneaux proposés à la commande tiennent compte des disponibilités du service.</p><Link href="/menu" className="home-button home-button-primary">Commander à emporter ↗</Link></div>
    </section>
  </div>;
}
