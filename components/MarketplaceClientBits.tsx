'use client';
import {useEffect} from 'react';
import {trackFunnelEvent} from '../lib/funnel';

export function LandingTelemetry({market}:{market:string}){
 useEffect(()=>{trackFunnelEvent('landing_view',{market_code:market,surface:'production_marketplace_ssr'})},[market]);
 return null;
}

export function TrackedGigLink({slug,href,className,children}:{slug:string;href:string;className?:string;children:React.ReactNode}){
 return <a className={className} href={href} onClick={()=>trackFunnelEvent('campaign_cta_click',{campaign_slug:slug,surface:'production_marketplace_ssr'})}>{children}</a>;
}
