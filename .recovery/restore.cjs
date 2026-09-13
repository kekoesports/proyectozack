const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const component=process.argv[2],dest=process.argv[3];
if(!['web','worker','studio'].includes(component)||!dest||!path.isAbsolute(dest)||fs.existsSync(dest))throw new Error('Usage: node .recovery/restore.cjs web|worker|studio ABSOLUTE_NEW_DIRECTORY');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,component,'manifest.json'),'utf8'));
manifest.files=manifest.parts.flatMap(part=>JSON.parse(fs.readFileSync(path.join(__dirname,component,part),'utf8')));
if(manifest.files.some(f=>f.storage==='withheld-secret-candidate'))throw new Error('Capture has withheld files; review before reconstruction');
for(const f of manifest.files){
 if(path.isAbsolute(f.path)||f.path.split(/[\\/]/).includes('..'))throw new Error('Unsafe manifest');
 let bytes=f.storage.startsWith('git-base')?cp.execFileSync('git',['show',manifest.gitBase+':'+f.path],{cwd:root,maxBuffer:10*1024*1024}):fs.readFileSync(path.join(__dirname,component,f.path+'.source'));
 if(f.storage==='git-base-crlf')bytes=Buffer.from(bytes.toString('utf8').replace(/\r?\n/g,'\r\n'));
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw new Error('Hash mismatch '+f.path);
 const output=path.resolve(dest,f.path);
 if(!output.startsWith(path.resolve(dest)+path.sep))throw new Error('Outside destination');
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes,{flag:'wx'});
}
console.log('Restored '+manifest.files.length+' source files. No dependencies, secrets, assets or runtime data provisioned.');
