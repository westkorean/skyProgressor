export interface DungeonProgress {

catacombsLevel:number;

catacombsXp:number;

classes:{
  name:string;
  level:number;
}[];

}


export function parseDungeons(member:any):DungeonProgress {


const dungeon =
member?.dungeons?.dungeon_types?.catacombs;


const classes =
member?.dungeons?.player_classes ?? {};


return {


catacombsLevel:
dungeon?.level?.level ?? 0,


catacombsXp:
dungeon?.experience ?? 0,


classes:Object.entries(classes)
.map(([name,data]:any)=>({

name,

level:data?.experience ?? 0

}))


};


}