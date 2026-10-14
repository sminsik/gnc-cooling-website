"""Bounded child process: decode/sanitize, then real ClamAV inspection of both files."""
import json,sys,subprocess,resource,time,warnings
from pathlib import Path
from PIL import Image,ImageOps
import pikepdf

Image.MAX_IMAGE_PIXELS=40_000_000
resource.setrlimit(resource.RLIMIT_CPU,(35,35))
resource.setrlimit(resource.RLIMIT_FSIZE,(45*1024*1024,45*1024*1024))

class Blocked(Exception):pass
def sanitize_image(source,output,mime):
    with warnings.catch_warnings():
        warnings.simplefilter('error',Image.DecompressionBombWarning)
        with Image.open(source) as image:
            if image.format!={'image/jpeg':'JPEG','image/png':'PNG','image/webp':'WEBP'}[mime] or image.width*image.height>40_000_000 or getattr(image,'n_frames',1)!=1:raise Blocked()
            image.verify()
        with Image.open(source) as image:
            image.load();image=ImageOps.exif_transpose(image)
            image=image.convert('RGB' if mime=='image/jpeg' else 'RGBA')
            clean=Image.new(image.mode,image.size);clean.paste(image)
            params={'optimize':True} if mime=='image/png' else {'quality':85} if mime=='image/jpeg' else {'lossless':True,'method':6}
            clean.save(output,format={'image/jpeg':'JPEG','image/png':'PNG','image/webp':'WEBP'}[mime],**params)
            return {'width':clean.width,'height':clean.height}
def inspect(source,output,mime,engine,database,certs):
    for name in ('main.cvd','daily.cvd','bytecode.cvd'):
        choices=[database/name,database/name.replace('.cvd','.cld')]
        existing=[p for p in choices if p.is_file()]
        if not existing or (name=='daily.cvd' and time.time()-max(p.stat().st_mtime for p in existing)>172800):raise RuntimeError('definitions-unavailable')
    metadata={}
    def scan(path):
        result=subprocess.run([str(engine),'--database='+str(database),*(['--cvdcertsdir='+str(certs)] if certs.is_dir() else []),'--no-summary','--max-filesize=20M','--max-scansize=40M','--max-files=20','--max-recursion=10','--alert-exceeds-max=yes',str(path)],capture_output=True,timeout=25)
        if result.returncode==1:raise Blocked()
        if result.returncode!=0:raise RuntimeError('malware-scan-failed')
    scan(source)
    if mime in ('image/jpeg','image/png','image/webp'):
        try:metadata=sanitize_image(source,output,mime)
        except OSError:raise Blocked()
    elif mime=='application/pdf':
        with pikepdf.Pdf.open(source,attempt_recovery=False) as pdf:
            if pdf.is_encrypted or not 1<=len(pdf.pages)<=500 or len(pdf.objects)>100000 or pdf.check_pdf_syntax():raise Blocked()
            forbidden={'/A','/JS','/JavaScript','/AA','/OpenAction','/Launch','/EmbeddedFiles','/EmbeddedFile','/EF','/XFA','/RichMedia','/AcroForm','/URI','/GoToR','/GoToE','/SubmitForm','/ImportData','/Movie','/Sound','/Rendition','/3D','/Collection','/Filespec'}
            seen=set();count=0
            def walk(obj,depth=0):
                nonlocal count
                count+=1
                if count>200000 or depth>100:raise Blocked()
                if isinstance(obj,pikepdf.Object) and obj.is_indirect:
                    if obj.objgen in seen:return
                    seen.add(obj.objgen)
                if isinstance(obj,(pikepdf.Dictionary,pikepdf.Stream)):
                    for key,value in obj.items():
                        if str(key) in forbidden or (isinstance(value,pikepdf.Name) and str(value) in forbidden):raise Blocked()
                        walk(value,depth+1)
                elif isinstance(obj,pikepdf.Array):
                    for value in obj:walk(value,depth+1)
            walk(pdf.Root)
            for obj in pdf.objects:walk(obj)
            for key in list(pdf.docinfo.keys()):del pdf.docinfo[key]
            if '/Metadata' in pdf.Root:del pdf.Root['/Metadata']
            for obj in pdf.objects:
                if isinstance(obj,(pikepdf.Dictionary,pikepdf.Stream)) and '/Metadata' in obj:del obj['/Metadata']
            pdf.save(output,compress_streams=True,object_stream_mode=pikepdf.ObjectStreamMode.generate)
        with pikepdf.Pdf.open(output,attempt_recovery=False) as verified:
            if verified.is_encrypted or verified.check_pdf_syntax():raise Blocked()
    else:raise Blocked()
    if output.stat().st_size<12 or output.stat().st_size>source.stat().st_size:raise Blocked()
    scan(output)
    version=subprocess.run([str(engine),'--version'],capture_output=True,text=True,timeout=5).stdout.strip()
    if not version.startswith('ClamAV '):raise RuntimeError('engine-unavailable')
    return {**metadata,'engine':version[:100]}

if __name__=='__main__':
    try:
        result=inspect(Path(sys.argv[1]),Path(sys.argv[2]),sys.argv[3],Path(sys.argv[4]),Path(sys.argv[5]),Path(sys.argv[6]))
        print(json.dumps(result));sys.exit(0)
    except (Blocked,pikepdf.PasswordError,pikepdf.PdfError,Image.DecompressionBombError,Image.DecompressionBombWarning,SyntaxError,ValueError):sys.exit(42)
    except Exception:sys.exit(43)
