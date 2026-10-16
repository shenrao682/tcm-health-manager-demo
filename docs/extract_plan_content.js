// One-time extraction: CONTENT_ZH/EN (embedded in the demo) -> data/plan_content.json (normalized, tagged)
const fs=require("fs");
const src=fs.readFileSync("demo_script.js","utf8");
const ZH=eval("("+src.match(/const CONTENT_ZH = (\{[\s\S]*?\});\nconst CONTENT_EN/)[1]+")");
const EN=eval("("+src.match(/const CONTENT_EN = (\{[\s\S]*?\});\nconst CT =/)[1]+")");
const ACU_SEASON=eval("("+src.match(/const ACU_SEASON = (\{.*?\});/)[1]+")");
const terms=JSON.parse(fs.readFileSync("/Users/raoshen/Downloads/ChineseMedicineAI/tcm-health-manager-demo/data/solar_terms_24.json","utf8")).terms;
const CONS=Object.keys(ZH);
const slug=s=>s.toLowerCase().replace(/\(.*?\)/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
// seasons in which a food appears in any term's diet_focus
const foodSeasons=zh=>{ const set=new Set(); for(const t of terms) for(const f of t.wellness.diet_focus) if(zh.includes(f.replace(/\(.*?\)/,""))||f.includes(zh)) set.add(t.season); return [...set]; };
// goal tags by keyword (food level)
const GOALK=[[/山药|小米|红枣|南瓜|胡萝卜|萝卜|陈皮|薏米|赤小豆|冬瓜|莲藕|豆腐/,"digest"],[/百合|莲子|桂圆|小麦|银耳|玫瑰|佛手/,"sleep"],[/玫瑰|佛手|陈皮|金橘|柑橘|百合/,"stress"],[/羊肉|牛肉|鸡肉|核桃|桂圆|黄芪|生姜/,"energy"],[/薏米|赤小豆|冬瓜|萝卜|黄瓜|苦瓜|芹菜|绿豆|荷叶|陈皮/,"weight"]];
const goalsOf=zh=>GOALK.filter(([re])=>re.test(zh)).map(x=>x[1]).filter((v,i,a)=>a.indexOf(v)===i);
const CONTRA=[[/薏米|山楂|玫瑰|当归|黄酒|桂圆/,"pregnancy"],[/海鲜|螃蟹|花生|芒果/,"allergy_check"],[/黄酒|啤酒/,"alcohol"]];
const contraOf=zh=>CONTRA.filter(([re])=>re.test(zh)).map(x=>x[1]);
const items={}; const add=(it)=>{ if(items[it.id]){ it.constitutions.forEach(c=>{ if(!items[it.id].constitutions.includes(c)) items[it.id].constitutions.push(c); }); return it.id; } items[it.id]=it; return it.id; };
const plans={};
for(const c of CONS){ const z=ZH[c], e=EN[c]; plans[c]={summary:{zh:z.sum,en:e.sum},favor:[],avoid:[],routine:null,movement:null,recipe:null,acupoints:[]};
  // favor / avoid: each group may contain several foods; split zh by 、 and en by ", " (after any "label:" prefix)
  for(const [kind,zarr,earr] of [["favor",z.diet.y,e.diet.y],["avoid",z.diet.n,e.diet.n]]){
    zarr.forEach((zg,gi)=>{ const eg=earr[gi]; const zl=zg.split(/[::]/); const el=eg.split(/:\s*/); const zlabel=zl.length>1?zl[0]:null, elabel=el.length>1?el[0]:null;
      const zs=(zl.length>1?zl[1]:zl[0]).split(/、|,\s*/).map(s=>s.trim()).filter(Boolean); const es=(el.length>1?el[1]:el[0]).split(/,\s*|\s+and\s+/).map(s=>s.trim()).filter(Boolean);
      if(zs.length!==es.length){ // keep as one item when splits disagree
        plans[c][kind].push(add({id:`food.${slug(eg)}`,type:kind==="favor"?"diet_favor":"diet_avoid",zh:zg,en:eg,constitutions:[c],seasons:foodSeasons(zg),goals:goalsOf(zg),contraindications:contraOf(zg),source:{ref:"《中医食疗学》",section:"体质饮食宜忌",reviewed:false}}));
      } else zs.forEach((zi,i)=>{ const en=es[i]; plans[c][kind].push(add({id:`food.${slug(en)}`,type:kind==="favor"?"diet_favor":"diet_avoid",zh:zi,en:en,group:zlabel?{zh:zlabel,en:elabel}:undefined,constitutions:[c],seasons:foodSeasons(zi),goals:goalsOf(zi),contraindications:contraOf(zi),source:{ref:"《中医食疗学》",section:"体质饮食宜忌",reviewed:false}})); });
    });
  }
  plans[c].routine=add({id:`routine.${c}`,type:"routine",zh:z.sleep,en:e.sleep,constitutions:[c],seasons:["autumn","winter"],goals:["sleep","energy"],contraindications:[],source:{ref:"《中医养生学》",section:"起居调摄 · 子午流注",reviewed:false}});
  plans[c].movement=add({id:`movement.${c}`,type:"movement",zh:z.move,en:e.move,constitutions:[c],seasons:["spring","summer"],goals:["energy","weight"],contraindications:[],source:{ref:"《中医养生学》",section:"运动养生 · 导引",reviewed:false}});
  plans[c].recipe=add({id:`recipe.${slug(e.recipe.name)}`,type:"recipe",zh:z.recipe.name,en:e.recipe.name,detail:{zh:{fit:z.recipe.fit,ing:z.recipe.ing,how:z.recipe.how,note:z.recipe.note},en:{fit:e.recipe.fit,ing:e.recipe.ing,how:e.recipe.how,note:e.recipe.note}},constitutions:[c],seasons:foodSeasons(z.recipe.ing.join("、")),goals:goalsOf(z.recipe.ing.join("、")+z.recipe.name),contraindications:contraOf(z.recipe.ing.join("、")+z.recipe.note),source:{ref:"《中医食疗学》",section:"体质食疗方",reviewed:false}});
  z.acu.forEach((a,i)=>{ const ea=e.acu[i]; plans[c].acupoints.push(add({id:`acupoint.${a.m}`,type:"acupoint",code:a.m,zh:a.n,en:ea.n,detail:{zh:{loc:a.loc,how:a.how},en:{loc:ea.loc,how:ea.how}},constitutions:[c],seasons:ACU_SEASON[a.m]||[],goals:({ST36:["digest","energy"],CV6:["energy"],CV4:["energy"],KI1:["sleep"],SP6:["sleep"],KI3:["sleep"],ST40:["digest","weight"],SP9:["digest","weight"],LI11:[],SP10:[],BL17:[],LR3:["stress"],CV17:["stress","sleep"],LI20:[]})[a.m]||[],contraindications:(["SP6","CV4","CV6"].includes(a.m)?["pregnancy"]:[]),source:{ref:"《经络腧穴学》",section:a.m,reviewed:false}})); });
}
const out={schema_version:"0.1",note:"方案内容知识层:食材(宜/忌)、作息、运动、食疗方、穴位,逐条带 id、适用体质、季节标签、目标标签、禁忌标签与来源。plans 为九种体质的内容引用(只存 id)。「今日 3 条可执行项」排序引擎的候选即来自 plans[体质] 引用的 items。草案,source.reviewed=false 表示未经中医顾问核对。",
  goal_rules:{sleep:{types:["routine"],acupoints:["SP6","KI1","KI3","CV17"]},stress:{types:["recipe"],acupoints:["LR3","CV17"]},digest:{types:["diet_favor","recipe"],acupoints:["ST36","SP9","ST40"]},energy:{types:["routine","diet_favor","movement"],acupoints:["ST36","CV6","CV4"]},weight:{types:["movement","diet_avoid"],acupoints:["ST40","SP9"]}},
  items, plans};
fs.writeFileSync("/Users/raoshen/Downloads/ChineseMedicineAI/tcm-health-manager-demo/data/plan_content.json", JSON.stringify(out,null,1));
const byType={}; for(const it of Object.values(items)) byType[it.type]=(byType[it.type]||0)+1;
console.log("items:",Object.keys(items).length, byType); console.log("sample ids:",Object.keys(items).slice(0,12).join(", "));
console.log("items without seasons:",Object.values(items).filter(i=>!i.seasons.length).length, "| with contraindications:",Object.values(items).filter(i=>i.contraindications.length).map(i=>i.id).join(", "));
