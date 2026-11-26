const path=require('node:path');const express=require('express');
const {createDatabase}=require('./db');const {createAuth}=require('./middleware/auth');const {createRateLimit}=require('./middleware/rate-limit');const {HttpError}=require('./errors');
function createApp({database=createDatabase(),serveFrontend=true}={}){
 const app=express();const auth=createAuth(database);const globalLimit=createRateLimit({windowMs:15*60*1000,max:Number(process.env.API_RATE_LIMIT)||240});
 app.disable('x-powered-by');app.set('trust proxy',process.env.TRUST_PROXY==='true');app.use((req,res,next)=>{const origin=req.get('origin'),configured=process.env.WEB_ORIGIN;let allowed=!origin;if(origin){if(configured)allowed=origin===configured;else{try{allowed=new URL(origin).host===req.get('host');}catch{allowed=false;}}}if(allowed){if(origin){res.set('Access-Control-Allow-Origin',origin);res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Authorization, Content-Type');res.set('Access-Control-Allow-Methods','GET, POST, PATCH, DELETE, OPTIONS');}if(req.method==='OPTIONS')return res.sendStatus(204);return next();}return res.status(403).json({error:{code:'origin_not_allowed',message:'This website origin is not allowed.'}});});
 app.use(express.json({limit:'64kb',type:'application/json'}));app.use('/api',globalLimit);
 app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
 app.use('/api/auth',require('./routes/auth')(database,auth,createRateLimit));
 app.use('/api/destinations',require('./routes/destinations')(database,auth));
 app.use('/api/guides',require('./routes/guides')(database,auth));
 app.use('/api/bookings',require('./routes/bookings')(database,auth));
 app.use('/api/reviews',require('./routes/reviews')(database,auth));
 app.use('/api/applications',require('./routes/applications')(database,auth));
 app.use('/api/admin',require('./routes/admin')(database,auth));
 app.use('/api',(req,_res,next)=>next(new HttpError(404,'API endpoint not found.','not_found')));
 if(serveFrontend){const root=path.join(__dirname,'..');app.use('/css',express.static(path.join(root,'css')));app.use('/js',express.static(path.join(root,'js')));app.use('/assets',express.static(path.join(root,'assets')));app.get('/',(_req,res)=>res.sendFile(path.join(root,'index.html')));}
 app.use((req,_res,next)=>next(new HttpError(404,'Page not found.','not_found')));
 app.use((error,_req,res,_next)=>{if(res.headersSent)return;let status=error.status||500,code=error.code||'internal_error',message=error.message||'An unexpected error occurred.';if(error.type==='entity.parse.failed'){status=400;code='invalid_json';message='Request body must contain valid JSON.';}if(status>=500&&status!==503){console.error(error);message='An unexpected server error occurred.';code='internal_error';}res.status(status).json({error:{code,message}});});
 return {app,database};
}
module.exports={createApp};
