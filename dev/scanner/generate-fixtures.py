"""Synthetic content only. EICAR is a harmless antivirus test string."""
import os
from PIL import Image, PngImagePlugin
import pikepdf
from settings import work_directory

os.umask(0o077)
folder = work_directory() / 'fixtures'
folder.mkdir(parents=True, exist_ok=True, mode=0o700)
image = Image.new('RGB', (64, 64), (50, 100, 150))
meta = PngImagePlugin.PngInfo()
meta.add_text('Description', 'Synthetic metadata ' * 1000)
image.save(folder / 'safe.png', pnginfo=meta)
exif = Image.Exif()
exif[270] = 'Synthetic metadata ' * 1000
image.save(folder / 'safe.jpg', quality=95, exif=exif)
image.save(folder / 'safe.webp', lossless=True, exif=exif)
for name in ('safe.pdf', 'encrypted.pdf', 'javascript.pdf', 'embedded.pdf'):
    with pikepdf.Pdf.new() as pdf:
        pdf.add_blank_page(page_size=(200, 200))
        pdf.docinfo['/Subject'] = 'Synthetic metadata ' * 1000
        if name == 'javascript.pdf':
            pdf.Root.OpenAction = pikepdf.Dictionary(S=pikepdf.Name('/JavaScript'), JS='1+1')
        if name == 'embedded.pdf':
            pdf.attachments['fixture.txt'] = b'Synthetic attachment'
        pdf.save(folder / name, encryption=pikepdf.Encryption(owner='fixture-owner', user='fixture-user') if name == 'encrypted.pdf' else False)
(folder / 'broken.pdf').write_bytes(b'%PDF-1.7\ninvalid syntax fixture\n')
(folder / 'eicar.pdf').write_bytes(b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')
print('Generated 9 synthetic fixtures in the ignored scanner work directory.')
