const {test}=require('node:test');const assert=require('node:assert/strict');const {createServer}=require('node:http');const {createDatabase}=require('../backend/db');const {createApp}=require('../backend/app');const {hashPassword}=require('../backend/security');
process.env.AUTH_SECRET='test-secret-value-with-at-least-32-characters-long';
process.env.WEB_ORIGIN='http://127.0.0.1:5500';

test('API covers auth, authorization, destinations, booking, reviews and volunteer approval',async(t)=>{
 const database=createDatabase(':memory:');const {app}=createApp({database,serveFrontend:false});const server=createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/api`;
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));database.close();});
 async function request(path,{method='GET',token,body}={}){const response=await fetch(`${base}${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`} :{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=response.status===204?null:await response.json();return{response,data};}
 const adminHash=await hashPassword('admin-password-test-123');const adminId=Number(database.prepare("INSERT INTO users(full_name,email,password_hash,role) VALUES('Admin','admin@test.local',?,'admin')").run(adminHash).lastInsertRowid);const admin=require('../backend/security').signToken(database.prepare('SELECT * FROM users WHERE id=?').get(adminId));
 let out;
 let response=await fetch(`${base}/health`,{headers:{origin:process.env.WEB_ORIGIN}});assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),process.env.WEB_ORIGIN);
 response=await fetch(`${base}/health`,{headers:{origin:'https://untrusted.example'}});assert.equal(response.status,403);
 const authSecret=process.env.AUTH_SECRET;delete process.env.AUTH_SECRET;out=await request('/auth/register',{method:'POST',body:{fullName:'No Secret',email:'no-secret@example.test',password:'long-enough-test-password'}});assert.equal(out.response.status,503);assert.equal(database.prepare('SELECT COUNT(*) count FROM users').get().count,1);process.env.AUTH_SECRET=authSecret;
 const destinations=await request('/destinations');assert.equal(destinations.response.status,200);assert.equal(destinations.data.data.length,6);const firstDestination=destinations.data.data[0];
 out=await request('/destinations',{method:'POST',token:admin,body:{name:'Test Place',description:'A valid destination description',location:'Test Region'}});assert.equal(out.response.status,201);const createdDestination=out.data.data;
 out=await request(`/destinations/${createdDestination.id}`,{method:'PATCH',token:admin,body:{category:'Culture'}});assert.equal(out.data.data.category,'Culture');
 out=await request('/destinations',{method:'POST',body:{name:'Denied',description:'Denied destination',location:'Nowhere'}});assert.equal(out.response.status,401);
 out=await request('/auth/register',{method:'POST',body:{fullName:'Tourist Tester',email:'tourist@example.test',password:'long-enough-test-password'}});assert.equal(out.response.status,201);const tourist=out.data.token;
 out=await request('/auth/register',{method:'POST',body:{fullName:'Duplicate',email:'TOURIST@example.test',password:'long-enough-test-password'}});assert.equal(out.response.status,409);
 const guideHash=await hashPassword('another-long-test-password');const guideUserId=Number(database.prepare("INSERT INTO users(full_name,email,password_hash,role) VALUES('Guide Tester','guide@example.test',?,'guide')").run(guideHash).lastInsertRowid);const guideId=Number(database.prepare("INSERT INTO guides(user_id,location,languages,introduction,approval_status) VALUES(?,'Test Region','[\"English\"]','Test guide introduction','approved')").run(guideUserId).lastInsertRowid);const guideToken=require('../backend/security').signToken(database.prepare('SELECT * FROM users WHERE id=?').get(guideUserId));
 out=await request('/guides?language=English');assert.equal(out.data.pagination.total,1);
 const travelDate=new Date(Date.now()+86400000*10).toISOString().slice(0,10);
 out=await request('/bookings',{method:'POST',token:tourist,body:{guideId,destinationId:firstDestination.id,travelDate,requestDetails:'Please show me around.'}});assert.equal(out.response.status,201);const bookingId=out.data.data.id;
 out=await request(`/bookings/${bookingId}/status`,{method:'PATCH',token:guideToken,body:{status:'accepted'}});assert.equal(out.data.data.status,'accepted');
 let secondTourist=await request('/auth/register',{method:'POST',body:{fullName:'Second Tourist',email:'second@example.test',password:'long-enough-test-password'}});assert.equal(secondTourist.response.status,201);
 out=await request('/bookings',{method:'POST',token:secondTourist.data.token,body:{guideId,destinationId:firstDestination.id,travelDate,requestDetails:'Same day request.'}});assert.equal(out.response.status,201);const conflictingBooking=out.data.data.id;
 out=await request(`/bookings/${conflictingBooking}/status`,{method:'PATCH',token:guideToken,body:{status:'accepted'}});assert.equal(out.response.status,409);
 out=await request(`/bookings/${bookingId}/status`,{method:'PATCH',token:guideToken,body:{status:'completed'}});assert.equal(out.data.data.status,'completed');
 out=await request(`/bookings/${conflictingBooking}/status`,{method:'PATCH',token:guideToken,body:{status:'rejected'}});assert.equal(out.data.data.status,'rejected');
 out=await request('/reviews',{method:'POST',token:tourist,body:{guideId,rating:5,comment:'A verified review.'}});assert.equal(out.response.status,201);
 out=await request('/reviews',{method:'POST',token:tourist,body:{guideId,rating:5,comment:'Duplicate review.'}});assert.equal(out.response.status,409);
 out=await request('/reviews?guideId='+guideId);assert.equal(out.data.summary.averageRating,5);
 out=await request('/applications',{method:'POST',token:tourist,body:{introduction:'I know my region well.',location:'Test Region',languages:['Bangla','English'],experience:'Community volunteering.'}});assert.equal(out.response.status,201);const applicationId=out.data.data.id;
 out=await request('/applications',{method:'GET',token:tourist});assert.equal(out.response.status,403);
 out=await request(`/applications/${applicationId}/decision`,{method:'PATCH',token:admin,body:{status:'approved',decision:'Approved after review.'}});assert.equal(out.response.status,200);assert.equal(database.prepare('SELECT role FROM users WHERE id=(SELECT applicant_id FROM volunteer_applications WHERE id=?)').get(applicationId).role,'guide');
 out=await request('/auth/logout',{method:'POST',token:tourist});assert.equal(out.response.status,200);out=await request('/auth/me',{token:tourist});assert.equal(out.response.status,401);
 assert.ok(createdDestination.id);assert.equal((await request('/destinations/'+createdDestination.id)).response.status,200);
});
