# 🎸 Nashville.com — Music City Tourism Site

A standalone, single-page **Nashville tourism website** modeled on the structure of
[vegas.com](https://www.vegas.com/): a hero search widget, featured hotels, shows &
entertainment, things to do, dining, neighborhoods, deals, and a newsletter signup.

Built with plain **HTML, CSS, and vanilla JavaScript** — no build step, no
dependencies, no external assets. Just open it and go.

## ✨ Features

- **Hero search** with Hotels / Shows / Tours tabs and date + guest pickers
- **Dynamic cards** rendered from a single content file (`js/data.js`)
- Sections: **Hotels · Shows & the Grand Ole Opry · Things To Do · Dining ·
  Neighborhoods · Deals**
- **Newsletter signup** and interactive "Book" buttons with toast feedback
- Fully **responsive** (desktop → mobile) with a hamburger menu
- **Reveal-on-scroll** animations and a Music City color theme
  (midnight navy + honky-tonk neon gold)
- Zero external images — emoji + CSS gradients keep it 100% self-contained

## 🚀 Run it locally

No install needed. Either:

```bash
# Option A: just open the file
open index.html

# Option B: serve it (recommended, avoids any file:// quirks)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 📁 Structure

```
nashville-tourism/
├── index.html        # Page markup & sections
├── css/
│   └── styles.css    # Theme, layout, responsive rules
└── js/
    ├── data.js       # All hotel / show / dining / deal content
    └── main.js       # Card rendering + interactions
```

## 🛠️ Customize

Edit `js/data.js` to change any listing — no HTML edits required. Each entry
supports `name`, `area`, `stars`, `price`, `badge`, `desc`, and an `emoji`
that becomes the card artwork.

## 📦 Deploy

Because it's fully static, it deploys anywhere:

- **GitHub Pages** — Settings → Pages → deploy from `main` / root
- **Netlify / Vercel** — drag-and-drop the folder or connect the repo
- **Any static host** — upload the three folders as-is

---

*Demo project. Not affiliated with the City of Nashville or vegas.com.*
