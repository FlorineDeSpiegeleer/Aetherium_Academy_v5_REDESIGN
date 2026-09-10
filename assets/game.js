
const KEY="AETHERIUM";
let STORY=null;
let state={
 clues:[], evidenceSelected:[], visited:[], currentLocation:null, locationAnswers:{},
 interviews:[], interviewClues:[], phone1:false, phone2:false, phone3:false,
 affinity:{florine:{rowan:0,kestrel:0,maeve:0,elias:0},margot:{rowan:0,kestrel:0,maeve:0,elias:0},selena:{rowan:0,kestrel:0,maeve:0,elias:0}},
 privateChoices:{}, splitEvidence:[], puzzle:{p1:false,p2:false,p3:false,p4:false}
};
let dialogueQueue=[], dialogueIndex=0, dialogueTimer=null, nextScene=null, paused=false;
let soundOn=false, voices=[], currentUtterance=null;

const portraitMap={
 "Rector Cael":"assets/rector.jpg","Rowan Vale":"assets/rowan.jpg","Maeve Sol":"assets/maeve.jpg",
 "Elias Thorne":"assets/elias.jpg","Kestrel Ardan":"assets/kestrel.jpg","Lyra Voss":"assets/lyra.jpg",
 "Professor Fen":"assets/fen.jpg","Professor Ilyra Fen":"assets/fen.jpg","Professor Veyne":"assets/veyne.jpg",
 "Narrator":null,"Academy Voice":null,"Unknown":null
};
const bgMap={prologue:"assets/academy.jpg",death:"assets/hall.jpg",body:"assets/library.jpg",
 after_phone1:"assets/hall.jpg",twist:"assets/hall.jpg",finale_intro:"assets/hall.jpg"};

const locations={
 archive:{
  title:"Verboden Archief",tag:"ARCHIEF",image:"assets/library.jpg",
  fragments:[
   "Een onderhoudsregister is op dezelfde avond tweemaal geopend, maar één handtekening ontbreekt.",
   "Een dossier over disciplinaire maatregelen mist exact één pagina.",
   "Een oude sleutelkaart vermeldt dat bepaalde academische functies deuren anders registreren dan studenten."
  ],
  options:[
   ["Volg het onderhoudsregister","access","Dit spoor zegt vooral iets over toegang en wie ongezien door bepaalde wards kan."],
   ["Volg de ontbrekende dossierpagina","dossier","Dit spoor wijst op een persoonlijk geheim. Belangrijk, maar nog niet automatisch moordbewijs."],
   ["Onderzoek de sleutelkaart","route","De kaart maakt duidelijk dat officiële logs niet voor iedereen dezelfde betrouwbaarheid hebben."]
  ]
 },
 greenhouse:{
  title:"Maanserre",tag:"MAANSERRE",image:"assets/greenhouse.jpg",
  fragments:[
   "Op een werktafel ligt hars met een duidelijke dennengeur.",
   "Naast de hars staat een lege plantenpot met fijn, lichtgevend stof op de rand.",
   "Een student heeft een boek over verdovende kruiden open laten liggen — opvallend, maar zonder gebruikte bladeren."
  ],
  options:[
   ["Vergelijk geur en materiaal","resin","De geur lijkt eerder bij een technisch materiaal dan bij een drankje te horen."],
   ["Volg het verdovende-kruidenboek","herb","Een geloofwaardige afleiding: het boek is verdacht, maar er ontbreekt geen plantmateriaal."],
   ["Onderzoek het lichtgevende stof","dust","Het stof lijkt te zijn overgedragen vanaf een instrument of handschoen."]
  ]
 },
 alchemy:{
  title:"Alchemiepracticum",tag:"PRACTICUM",image:"assets/alchemy.jpg",
  fragments:[
   "Het uitgifteregister bevat een tijdstip vlak vóór het alarm.",
   "Twee materialen die vanavond voorkomen zijn niet exclusief alchemistisch: instrumentmakers gebruiken ze ook.",
   "Een servicehatch verbindt het practicum met instrumentopslag."
  ],
  options:[
   ["Controleer het uitgifteregister","ledger","Het tijdstip is nuttig, maar bewijst alleen dat iemand materiaal had — niet waarvoor."],
   ["Onderzoek de servicehatch","hatch","De route maakt een alternatieve beweging door de academie mogelijk."],
   ["Vergelijk materiaaltoepassingen","materials","Hetzelfde materiaal kan een technische én alchemistische context hebben."]
  ]
 },
 hall:{
  title:"Grote Hal",tag:"GETUIGEN",image:"assets/hall.jpg",
  fragments:[
   "Drie getuigen herinneren zich de klokslagen anders.",
   "Iemand beweert vlak vóór de stroomuitval bij de oosttrap te zijn geweest.",
   "Een prefectlog en een persoonlijke getuigenis spreken elkaar tegen."
  ],
  options:[
   ["Maak een voorlopige tijdlijn","timeline","Er zit een fout in de tijdswaarneming. Zonder correctie lijkt minstens één persoon onterecht verdacht."],
   ["Volg de prefectlog","prefectlog","Officiële logs zijn belangrijk, maar niet absoluut."],
   ["Vergelijk de getuigen","witness","De verschillen zijn klein genoeg om betekenisvol te zijn."]
  ]
 }
};

async function loadStory(){
 const b64=await fetch("assets/story.dat").then(r=>r.text());
 const bin=atob(b64.trim()); let out="";
 for(let i=0;i<bin.length;i++) out+=String.fromCharCode(bin.charCodeAt(i)^KEY.charCodeAt(i%KEY.length));
 STORY=JSON.parse(out);
 document.getElementById("startBtn").disabled=false;
 prepareVoices();
}
function save(){localStorage.setItem("aetherium_main_v5",JSON.stringify(state))}
function load(){try{const x=JSON.parse(localStorage.getItem("aetherium_main_v5"));if(x)state={...state,...x}}catch(e){}}
function resetGame(){if(confirm("Wil je het volledige spel opnieuw starten?")){localStorage.removeItem("aetherium_main_v5");location.reload()}}
function show(id){
 document.querySelectorAll(".scene").forEach(s=>s.classList.add("hidden"));
 const el=document.getElementById(id);el.classList.remove("hidden");
 window.scrollTo({top:0,behavior:"smooth"});
 updateHud();save();
 if(id==="social")refreshInterviewStatus();
}
function updateHud(){
 const score=state.clues.length+state.visited.length*2+Object.values(state.puzzle).filter(Boolean).length*3+state.interviews.length;
 document.getElementById("progressFill").style.width=Math.min(100,4+score*3.5)+"%";
 document.getElementById("clueCount").textContent=state.clues.length;
}
function prepareVoices(){
 if(!("speechSynthesis" in window))return;
 voices=speechSynthesis.getVoices();
 speechSynthesis.onvoiceschanged=()=>voices=speechSynthesis.getVoices();
}
function ensureAudio(){
 const ambience=document.getElementById("ambienceAudio");
 if(document.getElementById("ambienceToggle")?.checked || soundOn){
   ambience.volume=.72;
   ambience.play().then(()=>{soundOn=true;document.getElementById("soundBtn").textContent="🔇"}).catch(()=>{});
 }
}
function toggleSound(){
 const a=document.getElementById("ambienceAudio");
 if(soundOn){a.pause();soundOn=false;document.getElementById("soundBtn").textContent="🔊"}
 else{a.volume=.72;a.play().then(()=>{soundOn=true;document.getElementById("soundBtn").textContent="🔇"}).catch(()=>alert("Klik eerst op ‘Betreed Aetherium’ om geluid toe te staan."))}
}
function speak(text,speaker){
 if(!document.getElementById("voiceToggle")?.checked || !("speechSynthesis" in window))return;
 speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(text);
 const dutch=voices.find(v=>/^nl/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||voices[0];
 if(dutch)u.voice=dutch;
 u.lang=dutch?.lang||"nl-BE";u.rate=1.08;u.pitch=speaker==="Narrator"?.92:1;u.volume=1;
 currentUtterance=u;speechSynthesis.speak(u);
}
function lineDuration(text){return Math.max(2400,Math.min(4700,1600+text.length*18))}
function startGame(){ensureAudio();runDialogue("prologue","deathBeat")}
function runDialogue(key,after){
 dialogueQueue=STORY.act_lines[key];dialogueIndex=0;nextScene=after;paused=false;
 const stage=document.getElementById("dialogueStage");
 stage.style.backgroundImage=`url('${bgMap[key]||"assets/academy.jpg"}')`;
 show("dialogue");nextDialogueLine();
}
function nextDialogueLine(){
 clearTimeout(dialogueTimer);
 if(dialogueIndex>=dialogueQueue.length){speechSynthesis?.cancel();dialogueTimer=setTimeout(()=>show(nextScene),650);return}
 const [speaker,text]=dialogueQueue[dialogueIndex++];
 const stage=document.getElementById("dialogueStage");
 const portrait=portraitMap[speaker];
 stage.innerHTML=`<div class="vn-card">
 <div class="vn-portrait-wrap">${portrait?`<img class="vn-portrait" src="${portrait}" alt="${speaker}">`:`<div class="vn-portrait placeholder">${speaker==="Narrator"?"✒️":"✦"}</div>`}<div class="vn-speaker">${speaker}</div></div>
 <div class="vn-textbox"><div class="vn-text">${text}</div></div></div>`;
 const dur=lineDuration(text);
 document.getElementById("dialogueTimer").innerHTML=`<div style="--dur:${dur}ms"></div>`;
 speak(text,speaker);dialogueTimer=setTimeout(nextDialogueLine,dur);
}
function pauseDialogue(){
 paused=!paused;const b=document.getElementById("pauseBtn");
 if(paused){clearTimeout(dialogueTimer);speechSynthesis?.pause();b.textContent="▶ Verder"}
 else{speechSynthesis?.resume();b.textContent="⏸ Pauze";dialogueTimer=setTimeout(nextDialogueLine,900)}
}
function skipLine(){speechSynthesis?.cancel();nextDialogueLine()}
function goDeath(){runDialogue("death","observatory")}

/* Observatory: meaningful selection, not hidden hints */
function toggleEvidence(code,el){
 if(state.evidenceSelected.includes(code)){state.evidenceSelected=state.evidenceSelected.filter(x=>x!==code);el.classList.remove("selected")}
 else if(state.evidenceSelected.length<3){state.evidenceSelected.push(code);el.classList.add("selected")}
 document.getElementById("evidenceCount").textContent=state.evidenceSelected.length+"/3";
 document.getElementById("confirmEvidence").disabled=state.evidenceSelected.length!==3;
}
function confirmEvidence(){
 state.evidenceSelected.forEach(c=>{if(!state.clues.includes(c))state.clues.push(c)});
 save();runDialogue("body","corridorEvent");
}
function corridorChoice(which){
 const map={
  ward:"De ward reageert op bevoegdheidsniveau, niet alleen op naam. Dat betekent dat toegang belangrijker kan zijn dan fysieke sleutels.",
  panel:"Achter het paneel loopt een oud mechanisch kanaal naar instrumentbediening. Iemand kende de infrastructuur.",
  people:"Niet iedereen schrikt op hetzelfde moment. Eén reactie is te snel, een andere opvallend gecontroleerd — maar dat is nog geen bewijs."
 };
 document.getElementById("corridorResult").innerHTML=`<div class="notice">${map[which]}</div>`;
 if(!state.clues.includes("corridor-"+which))state.clues.push("corridor-"+which);
 document.getElementById("corridorNext").classList.remove("hidden");updateHud();save();
}

/* Location investigations */
function openLocation(loc){
 if(state.visited.includes(loc))return;
 state.currentLocation=loc;
 const d=locations[loc];
 document.getElementById("locationImage").src=d.image;
 document.getElementById("locationTitle").textContent=d.title;
 document.getElementById("locationTag").textContent=d.tag;
 document.getElementById("locationFragments").innerHTML=d.fragments.map(x=>`<div class="fragment">${x}</div>`).join("");
 document.getElementById("locationOptions").innerHTML=d.options.map((o,i)=>`<button class="choice" onclick="resolveLocation('${o[1]}',${i})">${o[0]}</button>`).join("");
 document.getElementById("locationResult").innerHTML="";
 document.getElementById("locationDone").classList.add("hidden");
 show("locationScene");
}
function resolveLocation(code,index){
 const d=locations[state.currentLocation],o=d.options[index];
 state.locationAnswers[state.currentLocation]=code;
 if(!state.clues.includes("loc-"+state.currentLocation+"-"+code))state.clues.push("loc-"+state.currentLocation+"-"+code);
 document.getElementById("locationResult").innerHTML=`<div class="notice"><strong>Jullie conclusie:</strong> ${o[2]}</div>`;
 document.querySelectorAll("#locationOptions button").forEach(b=>b.disabled=true);
 document.getElementById("locationDone").classList.remove("hidden");updateHud();save();
}
function finishLocation(){
 const loc=state.currentLocation;
 if(!state.visited.includes(loc))state.visited.push(loc);
 document.querySelector(`[data-loc="${loc}"]`)?.classList.add("used");
 state.currentLocation=null;
 document.getElementById("locationProgress").textContent=state.visited.length+"/2 locaties afgerond.";
 save();
 if(state.visited.length>=2)setTimeout(()=>show("phone1"),500);else show("explore1");
}

/* Phone codes */
const CODEMAP={
"F1-A":{p:"florine",aff:["kestrel",1]},"F1-B":{p:"florine",aff:["maeve",1]},"F1-C":{p:"florine",aff:["rowan",1]},
"M1-A":{p:"margot",aff:["kestrel",1]},"M1-B":{p:"margot",aff:["rowan",1]},"M1-C":{p:"margot",aff:["elias",1]},
"S1-A":{p:"selena",aff:["elias",1]},"S1-B":{p:"selena",aff:["maeve",1]},"S1-C":{p:"selena",aff:["rowan",1]},
"F2-R":{p:"florine",aff:["rowan",2]},"F2-K":{p:"florine",aff:["kestrel",2]},"F2-M":{p:"florine",aff:["maeve",2]},"F2-E":{p:"florine",aff:["elias",2]},
"M2-R":{p:"margot",aff:["rowan",2]},"M2-K":{p:"margot",aff:["kestrel",2]},"M2-M":{p:"margot",aff:["maeve",2]},"M2-E":{p:"margot",aff:["elias",2]},
"S2-R":{p:"selena",aff:["rowan",2]},"S2-K":{p:"selena",aff:["kestrel",2]},"S2-M":{p:"selena",aff:["maeve",2]},"S2-E":{p:"selena",aff:["elias",2]},
"F3-A":{p:"florine"},"F3-B":{p:"florine"},"F3-C":{p:"florine"},
"M3-A":{p:"margot"},"M3-B":{p:"margot"},"M3-C":{p:"margot"},
"S3-A":{p:"selena"},"S3-B":{p:"selena"},"S3-C":{p:"selena"}
};
function applyCode(code){
 code=code.trim().toUpperCase();const m=CODEMAP[code];if(!m)return false;
 state.privateChoices[code]=true;if(m.aff)state.affinity[m.p][m.aff[0]]+=m.aff[1];
 if(code.includes("3-")&&!state.splitEvidence.includes(code))state.splitEvidence.push(code);return true;
}
function submitPhone(phase){
 let ok=true;for(const id of ["f","m","s"]){const el=document.getElementById(`${phase}-${id}`);if(!applyCode(el.value)){el.style.borderColor="var(--red)";ok=false}else el.style.borderColor="var(--green)"}
 if(!ok){document.getElementById(`${phase}-error`).textContent="Minstens één code klopt niet. Controleer de telefoons.";return}
 state["phone"+phase]=true;save();
 if(phase===1)runDialogue("after_phone1","puzzle1");
 if(phase===2)show("puzzle3");
 if(phase===3)show("puzzle4");
}

/* Puzzles */
function checkPuzzle1(){
 const ok=document.getElementById("p1offset").value==="7"&&document.getElementById("p1window").value==="2308-2312"&&document.getElementById("p1route").value==="prefect";
 document.getElementById("p1feedback").innerHTML=ok?`<span style="color:var(--green)">De tijdlijn sluit. Jullie hebben een echt toegangvenster gevonden.</span>`:`<span style="color:var(--red)">Nog niet. Corrigeer eerst de klok en gebruik daarna de looptijden en wardregel.</span>`;
 if(ok){state.puzzle.p1=true;if(!state.clues.includes("timeline"))state.clues.push("timeline");document.getElementById("p1next").disabled=false}updateHud();save();
}
function checkPuzzle2(){
 const ok=document.getElementById("p2a").value==="paper"&&document.getElementById("p2b").value==="alignment"&&document.getElementById("p2c").value==="protection";
 document.getElementById("p2feedback").innerHTML=ok?`<span style="color:var(--green)">De functies passen. Het profiel wijst veel sterker op instrumentwerk dan op een drinkbaar middel.</span>`:`<span style="color:var(--red)">Minstens één materiaal is verkeerd gekoppeld.</span>`;
 if(ok){state.puzzle.p2=true;if(!state.clues.includes("materials"))state.clues.push("materials");document.getElementById("p2next").disabled=false}updateHud();save();
}
function checkPuzzle3(){
 const ok=document.getElementById("p3answer").value.trim().toUpperCase().replace(/\s/g,"")==="ASTERION";
 document.getElementById("p3feedback").innerHTML=ok?`<span style="color:var(--green)">Het woord klopt.</span>`:`<span style="color:var(--red)">Leg de drie stroken nog eens exact op de markeringen.</span>`;
 if(ok){state.puzzle.p3=true;if(!state.clues.includes("sigil"))state.clues.push("sigil");document.getElementById("p3next").disabled=false}updateHud();save();
}
function beginTwist(){runDialogue("twist","splitChoice")}
function chooseSplit(v){state.split=v;save();show("phone3")}
function checkPuzzle4(){
 const ok=document.getElementById("p4impossible").value==="fenlight"&&document.getElementById("p4conflict").value==="rowanlog"&&document.getElementById("p4conclusion").value==="secrets";
 document.getElementById("p4feedback").innerHTML=ok?`<span style="color:var(--green)">Juist. Verschillende leugens beschermen verschillende geheimen.</span>`:`<span style="color:var(--red)">Er is meer dan één onwaar detail. Behandel ze niet alsof ze dezelfde oorzaak hebben.</span>`;
 if(ok){state.puzzle.p4=true;if(!state.clues.includes("statement"))state.clues.push("statement");document.getElementById("p4next").disabled=false}updateHud();save();
}

/* Interviews: use same one-at-a-time dialogue presentation */
let currentInterview=null;
function openInterview(name){currentInterview=name;document.getElementById("interviewName").textContent=name;document.getElementById("interviewResponses").innerHTML="";document.getElementById("interviewDone").classList.add("hidden");show("interviewScene")}
function askInterview(topic){
 const lines=STORY.social_dialogue[currentInterview][topic];
 showInterviewLines(lines,0);
}
function showInterviewLines(lines,i){
 const box=document.getElementById("interviewResponses");
 if(i>=lines.length){
   const tag=currentInterview+"-asked";if(!state.interviewClues.includes(tag))state.interviewClues.push(tag);
   if(!state.interviews.includes(currentInterview))state.interviews.push(currentInterview);
   document.getElementById("interviewDone").classList.remove("hidden");save();return;
 }
 const [speaker,text]=lines[i],portrait=portraitMap[speaker]||portraitMap[currentInterview];
 box.innerHTML=`<div class="vn-card"><div class="vn-portrait-wrap">${portrait?`<img class="vn-portrait" src="${portrait}">`:`<div class="vn-portrait placeholder">✦</div>`}<div class="vn-speaker">${speaker}</div></div><div class="vn-textbox"><div class="vn-text">${text}</div></div></div>`;
 speak(text,speaker);setTimeout(()=>showInterviewLines(lines,i+1),lineDuration(text));
}
function leaveInterview(){if(state.interviews.length>=3)show("phone2");else show("social")}
function refreshInterviewStatus(){
 document.querySelectorAll("[data-person]").forEach(el=>{if(state.interviews.includes(el.dataset.person))el.classList.add("used")});
 const n=document.getElementById("interviewCount");if(n)n.textContent=state.interviews.length;
}

/* Final */
function companionFor(player){const o=state.affinity[player];return Object.keys(o).sort((a,b)=>o[b]-o[a])[0]}
function finalSetup(){runDialogue("finale_intro","accuse")}
function accuse(){
 const s=STORY.solution;
 const ok=document.getElementById("accCulprit").value===s.culprit&&document.getElementById("accMethod").value==="ward"&&document.getElementById("accMotive").value==="coverup";
 document.getElementById("accFeedback").innerHTML=ok?`<span style="color:var(--green)">Jullie reconstructie houdt stand.</span>`:`<span style="color:var(--red)">Er zit nog een gat in de theorie. Gebruik het dossier en verdedig minstens één alternatief.</span>`;
 if(ok)document.getElementById("revealBtn").classList.remove("hidden");
}
function reveal(){
 const s=STORY.solution;
 document.getElementById("revealText").innerHTML=`<h2>De waarheid</h2><p><strong>Dader:</strong> ${s.culprit}</p><p><strong>Methode:</strong> ${s.method}</p><p><strong>Motief:</strong> ${s.motive}</p><hr><h3>Waarom de aanwijzingen passen</h3><ol>${s.key_clues.map(x=>`<li>${x}</li>`).join("")}</ol>`;
 const names={rowan:"Rowan",kestrel:"Kestrel",maeve:"Maeve",elias:"Elias"};
 const lines={rowan:"zoekt je na afloop op met een halfgrijns en een voorstel dat verrassend serieus klinkt.",kestrel:"wacht bij de bibliotheekdeur met een sleutel die hij normaal aan niemand uitleent.",maeve:"schuift je een warme beker toe en vraagt of je morgen mee ontbijt.",elias:"laat tussen de bewijsstukken een droge grap en een uitnodiging achter."};
 document.getElementById("epilogues").innerHTML=["florine","margot","selena"].map(p=>{const b=companionFor(p);return `<div class="card"><strong>${p[0].toUpperCase()+p.slice(1)}</strong><p>${names[b]} ${lines[b]}</p></div>`}).join("");
 show("revealScene");
}

/* Dossier */
function toggleClueDrawer(){const d=document.getElementById("clueDrawer");if(d.classList.contains("hidden")){renderDrawer();d.classList.remove("hidden")}else d.classList.add("hidden")}
function renderDrawer(){
 const labels={cup:"Onaangeroerde beker",floor:"Stervormig spoor",lens:"Verschoven lens",note:"Gescheurde notitie",timeline:"Gecorrigeerde tijdlijn",materials:"Materiaalprofiel",sigil:"Onderhoudssigil",statement:"Tegenstrijdige verklaringen"};
 const box=document.getElementById("drawerEvidence");
 box.innerHTML=state.clues.length?state.clues.map(c=>`<div class="ev">✦ ${labels[c]||"Onderzoeksbevinding"}</div>`).join(""):`<div class="ev">Nog niets geregistreerd.</div>`;
}
window.addEventListener("load",()=>{load();loadStory();updateHud()});
