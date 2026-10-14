// Continue independent housekeeping after failures. Do not log payloads or exception text.
export async function runMaintenance(tasks:Record<string,()=>Promise<unknown>>){
 const failures:string[]=[];
 for(const [name,run] of Object.entries(tasks)){try{await run();}catch{failures.push(name);}}
 if(failures.length)throw new Error('Maintenance failed: '+failures.join(','));
}
