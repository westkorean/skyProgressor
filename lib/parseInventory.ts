export interface InventoryItem {
  id:string;
  count:number;
}


export interface InventoryData {

  inventory: InventoryItem[];

}


export function parseInventory(member:any):InventoryData {


const raw =
member?.inventory?.inv_contents?.data;


if(typeof raw !== "string"){

  return {
    inventory:[]
  };

}


// TODO:
// Decode NBT Base64 here later


return {

inventory:[]

};


}