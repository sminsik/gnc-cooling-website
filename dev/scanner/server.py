"""Private loopback service. Shared secret and serial, bounded inspection subprocesses."""
from http.server import BaseHTTPRequestHandler,HTTPServer
from pathlib import Path
import sys,json,secrets,subprocess,tempfile,socket,time,os,signal,threading

ROOT=Path(__file__).resolve().parents[3]
WORK=ROOT/'.work/c-local'
PROGRAMS=WORK/'clamav-expanded/clamav-1.5.4.macos.universal-programs.pkg/Payload/usr/local/clamav'
TOKEN=(WORK/'scanner-secret').read_text().strip()
def update_definitions():
    while True:
        try:
            result=subprocess.run([str(PROGRAMS/'bin/freshclam'),'--config-file='+str(WORK/'freshclam.conf'),'--cvdcertsdir='+str(PROGRAMS/'etc/certs')],env={**os.environ,'CVD_CERTS_DIR':str(PROGRAMS/'etc/certs')},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=180)
            if result.returncode!=0:print('Definition update incomplete; expired definitions cannot authorize files.',flush=True)
        except Exception:print('Definition update unavailable; expired definitions cannot authorize files.',flush=True)
        time.sleep(86400)
def bounded_inspection(args):
    child=subprocess.Popen(args,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,start_new_session=True)
    deadline=time.monotonic()+50
    try:
        while child.poll() is None:
            if time.monotonic()>deadline:raise RuntimeError('inspection-timeout')
            rows=subprocess.run(['/bin/ps','-axo','pgid=,rss='],capture_output=True,text=True,timeout=2).stdout.splitlines()
            usage=sum(int(parts[1]) for row in rows if len(parts:=row.split())==2 and int(parts[0])==child.pid)
            if usage>2048*1024:raise RuntimeError('inspection-memory-limit')
            time.sleep(.25)
        output=child.communicate(timeout=2)[0]
        return child.returncode,output
    finally:
        if child.poll() is None:os.killpg(child.pid,signal.SIGKILL)
        child.wait()

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_POST(self):
        self.connection.settimeout(15)
        if self.path!='/v1/content':return self.answer(404)
        if not secrets.compare_digest(self.headers.get('Authorization',''),'Bearer '+TOKEN):return self.answer(403)
        if self.headers.get('X-Scan-Contract')!='gnc-content-v1':return self.answer(400)
        mime=self.headers.get('Content-Type','')
        if mime not in ('image/jpeg','image/png','image/webp','application/pdf'):return self.answer(422)
        # Adapter supplies a bounded Content-Length; unsupported framing fails closed.
        raw=self.headers.get('Content-Length','')
        if not raw.isdigit() or not 12<=int(raw)<=20*1024*1024 or self.headers.get('Transfer-Encoding'):return self.answer(413)
        length=int(raw)
        try:
            with tempfile.TemporaryDirectory(prefix='inspection-',dir=WORK) as directory:
                source=Path(directory)/'source';output=Path(directory)/'safe'
                remaining=length
                with source.open('wb') as file:
                    while remaining:
                        chunk=self.rfile.read(min(65536,remaining))
                        if not chunk:raise ValueError()
                        file.write(chunk);remaining-=len(chunk)
                status,result=bounded_inspection([sys.executable,str(Path(__file__).with_name('inspect_file.py')),str(source),str(output),mime,str(PROGRAMS/'bin/clamscan'),str(WORK/'clamav-db'),str(PROGRAMS/'etc/certs')])
                if status==42:return self.answer(422)
                if status!=0:return self.answer(503)
                details=json.loads(result)
                self.send_response(200)
                for key,value in {'Content-Type':mime,'Content-Length':str(output.stat().st_size),'X-Scan-Contract':'gnc-content-v1','X-Scan-Engine':details['engine'],'X-Malware-Result':'clean','X-Structure-Result':'pass',**({'X-Pdf-Safe':'true'} if mime=='application/pdf' else {'X-Image-Sanitized':'true','X-Image-Width':str(details['width']),'X-Image-Height':str(details['height'])})}.items():self.send_header(key,value)
                self.end_headers()
                with output.open('rb') as file:
                    while chunk:=file.read(65536):self.wfile.write(chunk)
        except (Exception, socket.timeout):self.answer(503)
    def answer(self,status):
        self.send_response(status);self.send_header('Content-Length','0');self.end_headers()

if __name__=='__main__':
    threading.Thread(target=update_definitions,daemon=True).start()
    server=HTTPServer(('127.0.0.1',8790),Handler)
    print('Local scanner listening on 127.0.0.1:8790',flush=True)
    server.serve_forever()
