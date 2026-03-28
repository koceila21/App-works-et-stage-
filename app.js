const supabase = supabase.createClient("TON_URL","TON_KEY");

// LOGIN GOOGLE
async function loginWithGoogle(){
  await supabase.auth.signInWithOAuth({ provider:'google' });
}

// PROFIL
async function showCandidateProfile(){
  const user = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles").select("*").eq("id",user.data.user.id).single();

  content.innerHTML = `
    <div class="card">
      <h2>👤 Profil</h2>
      <p>${data.name || ""}</p>
      <p>${data.skills || ""}</p>
      <p>Score : ${data.ai_score || 0}</p>
    </div>
  `;
}

// JOBS
async function loadJobs(){
  const {data}=await supabase.from("jobs").select("*").eq("type","job");
  content.innerHTML=data.map(j=>`<div class="card">${j.title}</div>`).join("");
}

// STAGES
async function loadInternships(){
  const {data}=await supabase.from("jobs").select("*").eq("type","internship");
  content.innerHTML=data.map(j=>`<div class="card">${j.title}</div>`).join("");
}

// IA MATCH
async function generateMatches(){
  const {data:users}=await supabase.from("profiles").select("*");
  const {data:jobs}=await supabase.from("jobs").select("*");

  users.forEach(u=>{
    jobs.forEach(j=>{
      let score=0;
      if(u.skills && j.description){
        u.skills.split(",").forEach(s=>{
          if(j.description.toLowerCase().includes(s.trim())) score++;
        });
      }
      if(score>0){
        supabase.from("ai_matches").insert([{user_id:u.id,job_id:j.id,score}]);
      }
    });
  });
}

// CV UPLOAD + ANALYSE
async function uploadCV(){
  const file = document.getElementById("cv").files[0];
  const user = await supabase.auth.getUser();

  const path = `${user.data.user.id}/${file.name}`;

  await supabase.storage.from("cv-files").upload(path,file);

  readPDF(file);
}

// LECTURE PDF
async function readPDF(file){
  const reader = new FileReader();
  reader.onload = async function(){
    const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
    let text="";
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      const content=await page.getTextContent();
      content.items.forEach(t=>text+=t.str+" ");
    }
    analyzeCV(text);
  };
  reader.readAsArrayBuffer(file);
}

// IA CV
async function analyzeCV(text){
  let skills=[];
  ["cuisine","serveur","gestion","anglais"].forEach(k=>{
    if(text.includes(k)) skills.push(k);
  });

  const user = await supabase.auth.getUser();

  await supabase.from("profiles").update({
    skills:skills.join(","),
    ai_score:skills.length
  }).eq("id",user.data.user.id);
}

// ADMIN DASHBOARD + GRAPHIQUE
async function showAdminDashboard(){

  const {data:users}=await supabase.from("profiles").select("*");
  const {data:jobs}=await supabase.from("jobs").select("*");

  content.innerHTML=`
    <canvas id="chart"></canvas>
  `;

  setTimeout(()=>{
    new Chart(document.getElementById("chart"),{
      type:"bar",
      data:{
        labels:["Users","Jobs"],
        datasets:[{data:[users.length,jobs.length]}]
      }
    });
  },500);
}

// MAP
async function showMap(){
  content.innerHTML=`<div id="map" style="height:500px"></div>`;
  const map=L.map('map').setView([48.8566,2.3522],12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// UI
function showUploadCV(){
  content.innerHTML=`
    <input type="file" id="cv">
    <button onclick="uploadCV()">Upload</button>
  `;
}
