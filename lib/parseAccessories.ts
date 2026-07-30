export interface AccessoriesData {

  magicalPower:number;

  bagUpgrades:number;

}


export function parseAccessories(member:any):AccessoriesData {


return {

magicalPower:
member?.accessory_bag_storage
?.highest_magical_power ?? 0,


bagUpgrades:
member?.accessory_bag_storage
?.bag_upgrades_purchased ?? 0


};


}