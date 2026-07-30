import { knowledgeBase } from "./knowledge";


export function retrieveKnowledge(query:string){

  const words = query
    .toLowerCase()
    .split(" ");


  const results = knowledgeBase.map(entry => {

    const score = entry.tags.filter(tag =>
      words.includes(tag)
    ).length;


    return {
      ...entry,
      score
    };

  });


  return results
    .filter(r => r.score > 0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,3);

}