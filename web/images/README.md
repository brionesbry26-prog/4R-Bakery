# Website photos

The photos on the website are **AI-generated stand-ins** (made with Higgsfield, `z_image` model). They are realistic, but they are **not** photographs of 4R Bakery's actual products or shop.

## How the site loads them

For each photo, the site tries these sources in order:
1. The local file in this folder (for example `pandesal.webp`).
2. The remote copy listed in `photos.txt`.
3. The drawn illustration, if both fail.

## Save them locally (recommended)

Saving the files here means the site no longer depends on the remote image host. Run one of these from the repository root:

```powershell
.\web\images\download-photos.ps1      # Windows PowerShell
```
```bash
sh web/images/download-photos.sh       # macOS / Linux
```

## Use the bakery's real photos

To replace a stand-in, save the real photo here under the **same file name** (for example `ensaymada.webp`). `.jpg` and `.png` files also work if you update the file name in `web/js/photos.js`.

Tips for good results:
- Use landscape 4:3 images for products.
- Use a portrait 4:5 image for `hero`.
- Around 1600px wide is plenty.
