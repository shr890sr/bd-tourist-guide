const path=require('node:path');require('dotenv').config({path:path.join(__dirname,'..','.env')});
const {createApp}=require('./app');const {app,database}=createApp();const port=Number(process.env.PORT)||3000,host=process.env.HOST||'127.0.0.1';
const server=app.listen(port,host,()=>console.log(`BD Tourist Guide is available at http://${host}:${port}`));
function shutdown(){server.close(()=>{database.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
