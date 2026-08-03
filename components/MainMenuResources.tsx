const sites = [
  { name: 'Hypixel SkyBlock Wiki', description: 'Community-maintained mechanics, requirements, and item data.', href: 'https://hypixel-skyblock.fandom.com/wiki/Hypixel_SkyBlock_Wiki' },
  { name: 'SkyCrypt', description: 'Detailed public profile viewer and progression reference.', href: 'https://sky.shiiyu.moe/' },
  { name: 'Coflnet', description: 'Auction, bazaar, price history, and market tools.', href: 'https://sky.coflnet.com/' },
  { name: 'NotEnoughUpdates', description: 'Popular open-source SkyBlock utility mod.', href: 'https://github.com/NotEnoughUpdates/NotEnoughUpdates' },
];

const creators = [
  { name: 'ThirtyVirus', focus: 'Progression and update coverage', href: 'https://www.youtube.com/@ThirtyVirus' },
  { name: 'Toadstar0', focus: 'Guides and profile progression', href: 'https://www.youtube.com/@Toadstar0' },
  { name: 'ZachPlaysAN', focus: 'Ironman progression', href: 'https://www.youtube.com/@ZachPlaysAN' },
  { name: 'Derailious', focus: 'News, updates, and guides', href: 'https://www.youtube.com/@Derailious' },
  { name: 'fear5s', focus: 'Short-form SkyBlock progression and community videos', href: 'https://www.youtube.com/@fear5s' },
];

export default function MainMenuResources() {
  return <div className="relative mt-12 border-t-2 border-neutral-700 pt-8"><div className="mb-5"><h2 className="text-2xl font-black">SkyBlock field guide</h2><p className="mt-1 text-sm text-neutral-500">Trusted tools and popular community creators. External links open in a new tab.</p></div><div className="grid gap-6 lg:grid-cols-2"><div><h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Useful websites</h3><div className="grid gap-2">{sites.map((site) => <a key={site.name} href={site.href} target="_blank" rel="noopener noreferrer" className="group border border-neutral-700 bg-neutral-950 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-[4px_4px_0_#064e3b]"><div className="font-bold group-hover:text-emerald-300">{site.name} ↗</div><div className="mt-1 text-xs text-neutral-500">{site.description}</div></a>)}</div></div><div><h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-red-400">Popular creators</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{creators.map((creator, index) => <a key={creator.name} href={creator.href} target="_blank" rel="noopener noreferrer" className="border border-neutral-700 bg-neutral-950 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-red-500 hover:shadow-[4px_4px_0_#7f1d1d]"><div className="font-bold"><span className="mr-2 text-red-400">#{index + 1}</span>{creator.name}</div><div className="mt-1 text-[11px] text-neutral-500">{creator.focus}</div></a>)}</div></div></div></div>;
}
