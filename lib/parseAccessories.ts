export interface AccessoriesData {

  magicalPower:number;

  bagUpgrades:number;

}


function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function parseAccessories(member: unknown):AccessoriesData {

const storage = record(record(member)?.accessory_bag_storage);


return {

magicalPower:
typeof storage?.highest_magical_power === 'number' ? storage.highest_magical_power : 0,


bagUpgrades:
typeof storage?.bag_upgrades_purchased === 'number' ? storage.bag_upgrades_purchased : 0


};


}
