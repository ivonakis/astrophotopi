import PIL.Image, PIL.ImageDraw, base64, io, random

img = PIL.Image.new('RGB', (640, 480), (5, 5, 15))
d = PIL.ImageDraw.Draw(img)
for _ in range(250):
    x, y = random.randint(0, 639), random.randint(0, 479)
    b = random.randint(100, 255)
    r = random.randint(0, 2)
    d.ellipse([x-r, y-r, x+r, y+r], fill=(b, b, b))
d.ellipse([300, 220, 340, 260], fill=(255, 255, 200))
buf = io.BytesIO()
img.save(buf, format='JPEG', quality=85)
print(base64.b64encode(buf.getvalue()).decode())
